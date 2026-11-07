const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');

const OUTBOUND_REASONS = ['retur_rusak', 'pemakaian_internal', 'peminjaman', 'hilang'];
const MUTATION_TYPES = ['masuk', 'penjualan', 'keluar_non_penjualan', 'penyesuaian'];

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Kesalahan yang sengaja dilempar untuk membatalkan transaksi dengan status HTTP tertentu
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0 && String(v).trim() !== '';
const isNonNegNumber = (v) =>
  v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0;

// Format tanggal YYMMDD berdasarkan waktu server
const datePart = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

/**
 * Membuat nomor urut harian berikutnya (PREFIX-YYMMDD-XXXX) di dalam transaksi berjalan.
 * Baris terakhir dikunci agar permintaan paralel tidak menghasilkan nomor yang sama.
 */
const generateNumber = async (conn, prefix, table, column) => {
  const base = `${prefix}-${datePart()}-`;
  const [rows] = await conn.execute(
    `SELECT ${column} AS num FROM ${table} WHERE ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1 FOR UPDATE`,
    [`${base}%`]
  );
  const last = rows.length ? parseInt(rows[0].num.slice(base.length), 10) : 0;
  return `${base}${String((Number.isNaN(last) ? 0 : last) + 1).padStart(4, '0')}`;
};

const handleError = (res, error, label) => {
  if (error instanceof HttpError) return fail(res, error.status, error.message);
  if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'Nomor referensi sudah terdaftar');
  if (error.code === 'ER_NO_REFERENCED_ROW_2') return fail(res, 400, 'Data referensi (produk/pengguna) tidak valid');
  console.error(`Kesalahan ${label}:`, error);
  return fail(res, 500, 'Terjadi kesalahan internal server');
};

// POST /api/inventory/inbound
const createInbound = async (req, res) => {
  const body = req.body || {};
  const supplierName = typeof body.supplier_name === 'string' ? body.supplier_name.trim() : '';
  const receivedDate = typeof body.received_date === 'string' ? body.received_date.trim() : '';
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
  let receiptNumber = typeof body.receipt_number === 'string' ? body.receipt_number.trim() : '';

  // Validasi payload sebelum membuka transaksi
  if (!supplierName || supplierName.length > 150) {
    return fail(res, 400, 'Nama supplier wajib diisi (maksimal 150 karakter)');
  }
  const parsedDate = new Date(`${receivedDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate) || Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== receivedDate) {
    return fail(res, 400, 'Tanggal penerimaan wajib berformat YYYY-MM-DD yang valid');
  }
  if (receiptNumber.length > 50) return fail(res, 400, 'Nomor penerimaan maksimal 50 karakter');
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return fail(res, 400, 'Item barang masuk minimal 1 baris');
  }
  for (const [i, item] of body.items.entries()) {
    if (!item || !isPositiveInt(item.product_id)) return fail(res, 400, `Item ${i + 1}: produk tidak valid`);
    if (!isPositiveInt(item.quantity)) return fail(res, 400, `Item ${i + 1}: kuantitas harus bilangan bulat lebih dari 0`);
    if (!isNonNegNumber(item.purchase_price)) return fail(res, 400, `Item ${i + 1}: harga beli tidak boleh negatif`);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (receiptNumber) {
      const [dup] = await conn.execute('SELECT id FROM inbound_receipts WHERE receipt_number = ? LIMIT 1', [receiptNumber]);
      if (dup.length) throw new HttpError(409, 'Nomor penerimaan sudah terdaftar');
    } else {
      receiptNumber = await generateNumber(conn, 'INB', 'inbound_receipts', 'receipt_number');
    }

    const [header] = await conn.execute(
      'INSERT INTO inbound_receipts (receipt_number, supplier_name, received_date, notes, created_by) VALUES (?, ?, ?, ?, ?)',
      [receiptNumber, supplierName, receivedDate, notes, req.user.id]
    );
    const receiptId = header.insertId;

    for (const item of body.items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      const price = Number(item.purchase_price);

      const [rows] = await conn.execute('SELECT name, current_stock FROM products WHERE id = ? FOR UPDATE', [productId]);
      if (!rows.length) throw new HttpError(404, `Produk dengan ID ${productId} tidak ditemukan`);

      const stockAfter = rows[0].current_stock + quantity;
      const subtotal = quantity * price;

      await conn.execute(
        'INSERT INTO inbound_receipt_items (inbound_receipt_id, product_id, quantity, purchase_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [receiptId, productId, quantity, price, subtotal]
      );
      await conn.execute('UPDATE products SET current_stock = ?, purchase_price = ? WHERE id = ?', [stockAfter, price, productId]);
      await conn.execute(
        `INSERT INTO stock_mutation_logs (product_id, mutation_type, reference_code, quantity_change, stock_after, notes, user_id)
         VALUES (?, 'masuk', ?, ?, ?, ?, ?)`,
        [productId, receiptNumber, quantity, stockAfter, `Supplier: ${supplierName}`.slice(0, 255), req.user.id]
      );
    }

    await logAudit(
      {
        userId: req.user.id,
        action: 'INBOUND_RECEIPT',
        endpoint: 'POST /api/inventory/inbound',
        description: `Penerimaan barang masuk ${receiptNumber} dari ${supplierName} (${body.items.length} item)`,
      },
      conn
    );

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: 'Penerimaan barang masuk berhasil dibukukan.',
      data: { id: receiptId, receipt_number: receiptNumber },
    });
  } catch (error) {
    await conn.rollback();
    return handleError(res, error, 'createInbound');
  } finally {
    conn.release();
  }
};

// POST /api/inventory/outbound
const createOutbound = async (req, res) => {
  const body = req.body || {};
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
  let referenceNumber = typeof body.reference_number === 'string' ? body.reference_number.trim() : '';

  if (!isPositiveInt(body.product_id)) return fail(res, 400, 'Produk wajib dipilih');
  if (!isPositiveInt(body.quantity)) return fail(res, 400, 'Kuantitas harus bilangan bulat lebih dari 0');
  if (!OUTBOUND_REASONS.includes(body.reason)) {
    return fail(res, 400, "Alasan harus salah satu dari: 'retur_rusak', 'pemakaian_internal', 'peminjaman', 'hilang'");
  }
  if (referenceNumber.length > 50) return fail(res, 400, 'Nomor referensi maksimal 50 karakter');

  const productId = Number(body.product_id);
  const quantity = Number(body.quantity);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute('SELECT name, current_stock FROM products WHERE id = ? FOR UPDATE', [productId]);
    if (!rows.length) throw new HttpError(404, 'Produk tidak ditemukan');

    const currentStock = rows[0].current_stock;
    if (quantity > currentStock) {
      throw new HttpError(400, `Stok tidak mencukupi untuk mutasi keluar. Sisa stok: ${currentStock} unit.`);
    }
    const stockAfter = currentStock - quantity;

    if (referenceNumber) {
      const [dup] = await conn.execute('SELECT id FROM non_sales_outbounds WHERE reference_number = ? LIMIT 1', [referenceNumber]);
      if (dup.length) throw new HttpError(409, 'Nomor referensi sudah terdaftar');
    } else {
      referenceNumber = await generateNumber(conn, 'OUT', 'non_sales_outbounds', 'reference_number');
    }

    await conn.execute('UPDATE products SET current_stock = ? WHERE id = ?', [stockAfter, productId]);
    await conn.execute(
      'INSERT INTO non_sales_outbounds (reference_number, product_id, quantity, reason, notes, reported_by) VALUES (?, ?, ?, ?, ?, ?)',
      [referenceNumber, productId, quantity, body.reason, notes, req.user.id]
    );
    await conn.execute(
      `INSERT INTO stock_mutation_logs (product_id, mutation_type, reference_code, quantity_change, stock_after, notes, user_id)
       VALUES (?, 'keluar_non_penjualan', ?, ?, ?, ?, ?)`,
      [
        productId, referenceNumber, -Math.abs(quantity), stockAfter,
        `[${body.reason.toUpperCase()}] ${notes || ''}`.slice(0, 255), req.user.id,
      ]
    );

    await logAudit(
      {
        userId: req.user.id,
        action: 'NON_SALES_OUTBOUND',
        endpoint: 'POST /api/inventory/outbound',
        description: `Pengeluaran non-penjualan ${referenceNumber}: ${rows[0].name} x${quantity} (${body.reason})`,
      },
      conn
    );

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: 'Pengeluaran barang non-penjualan berhasil dicatat.',
      data: { reference_number: referenceNumber, stock_after: stockAfter },
    });
  } catch (error) {
    await conn.rollback();
    return handleError(res, error, 'createOutbound');
  } finally {
    conn.release();
  }
};

// GET /api/inventory/mutations
const getMutations = async (req, res) => {
  try {
    const { product_id, mutation_type } = req.query;
    const where = [];
    const params = [];

    if (product_id !== undefined && product_id !== '') {
      if (!isPositiveInt(product_id)) return fail(res, 400, 'product_id tidak valid');
      where.push('sml.product_id = ?');
      params.push(Number(product_id));
    }
    if (mutation_type) {
      if (!MUTATION_TYPES.includes(mutation_type)) return fail(res, 400, 'mutation_type tidak valid');
      if (mutation_type === 'penyesuaian') {
        where.push("sml.mutation_type IN ('penyesuaian')");
      } else {
        where.push('sml.mutation_type = ?');
        params.push(mutation_type);
      }
    }

    let limit = 100;
    if (req.query.limit !== undefined && req.query.limit !== '') {
      if (!isPositiveInt(req.query.limit)) return fail(res, 400, 'limit harus bilangan bulat positif');
      limit = Math.min(Number(req.query.limit), 500);
    }

    // limit sudah divalidasi sebagai integer sehingga aman diinterpolasi
    const [rows] = await db.query(
      `SELECT sml.id, sml.product_id, p.code AS product_code, p.name AS product_name, p.ring_size,
              sml.mutation_type, sml.reference_code, sml.quantity_change, sml.stock_after, sml.notes,
              u.name AS actor_name, sml.created_at
       FROM stock_mutation_logs sml
       JOIN products p ON p.id = sml.product_id
       LEFT JOIN users u ON u.id = sml.user_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY sml.id DESC LIMIT ${limit}`,
      params
    );

    return res.status(200).json({ success: true, message: 'Riwayat kartu stok berhasil dimuat.', data: rows });
  } catch (error) {
    return handleError(res, error, 'getMutations');
  }
};

module.exports = { createInbound, createOutbound, getMutations };