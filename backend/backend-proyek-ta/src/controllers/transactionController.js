const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');

const PAYMENT_METHODS = ['cash', 'qris', 'va'];
const PAYMENT_STATUSES = ['pending', 'settlement', 'expire', 'cancel'];

const fail = (res, status, message) => res.status(status).json({ success: false, message });

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isPositiveInt = (v) =>
  v !== '' && v !== null && v !== undefined && Number.isInteger(Number(v)) && Number(v) > 0;
const isNonNegNumber = (v) =>
  v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0;

/**
 * Validasi daftar item keranjang belanja POS.
 */
const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Keranjang belanja minimal harus berisi 1 item produk.';
  }
  for (const [idx, item] of items.entries()) {
    if (!item || !isPositiveInt(item.product_id)) {
      return `Item ke-${idx + 1}: ID produk tidak valid.`;
    }
    if (!isPositiveInt(item.quantity)) {
      return `Item ke-${idx + 1}: kuantitas harus bilangan bulat lebih dari 0.`;
    }
    if (!isNonNegNumber(item.unit_price)) {
      return `Item ke-${idx + 1}: harga satuan tidak boleh negatif.`;
    }
  }
  return null;
};

/**
 * Buat kode invoice unik: INV-XXXXXXXX (8 digit terakhir timestamp)
 */
const generateInvoiceCode = () => `INV-${Date.now().toString().slice(-8)}`;

const handleError = (res, error, label) => {
  if (error instanceof HttpError) return fail(res, error.status, error.message);
  if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'Kode invoice sudah terdaftar, silakan ulangi.');
  console.error(`Kesalahan ${label}:`, error);
  return fail(res, 500, 'Terjadi kesalahan internal server');
};

// POST /api/transactions (Pembayaran Tunai / Cash)
const createCashTransaction = async (req, res) => {
  const cashierId = req.user?.id || req.user?.userId;
  if (!cashierId) return fail(res, 401, 'Identitas kasir tidak terdeteksi.');

  const body = req.body || {};
  const items = body.items;
  const discount = Number(body.discount || 0);
  const paidAmount = Number(body.paid_amount);

  const itemsError = validateItems(items);
  if (itemsError) return fail(res, 400, itemsError);
  if (!isNonNegNumber(discount)) return fail(res, 400, 'Nominal diskon tidak boleh negatif.');
  if (!isNonNegNumber(body.paid_amount)) {
    return fail(res, 400, 'Nominal uang pembayaran tunai wajib diisi.');
  }

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0
  );
  const grandTotal = subtotal - discount;

  if (grandTotal < 0) {
    return fail(res, 400, 'Diskon tidak boleh melebihi subtotal belanja.');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (paidAmount < grandTotal) {
      throw new HttpError(400, 'Uang pembayaran tunai kurang dari total belanja.');
    }

    const changeAmount = paidAmount - grandTotal;
    const invoiceCode = generateInvoiceCode();

    const [headerResult] = await conn.execute(
      `INSERT INTO transactions
        (invoice_code, subtotal, discount, grand_total, payment_method, payment_status, paid_at, cashier_id)
       VALUES (?, ?, ?, ?, 'cash', 'settlement', NOW(), ?)`,
      [invoiceCode, subtotal, discount, grandTotal, cashierId]
    );
    const transactionId = headerResult.insertId;

    for (const item of items) {
      const productId = Number(item.product_id);
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      const [prodRows] = await conn.execute(
        'SELECT name, purchase_price, current_stock FROM products WHERE id = ? FOR UPDATE',
        [productId]
      );
      if (prodRows.length === 0) {
        throw new HttpError(404, `Produk dengan ID ${productId} tidak ditemukan.`);
      }

      const product = prodRows[0];
      const currentStock = Number(product.current_stock);

      if (qty > currentStock) {
        throw new HttpError(
          400,
          `Stok produk ${product.name} tidak mencukupi (sisa: ${currentStock} unit)`
        );
      }

      const costPrice = Number(product.purchase_price);
      const itemSubtotal = qty * unitPrice;
      const stockAfter = currentStock - qty;

      await conn.execute(
        `INSERT INTO transaction_items
          (transaction_id, product_id, quantity, cost_price, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [transactionId, productId, qty, costPrice, unitPrice, itemSubtotal]
      );

      await conn.execute(
        'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
        [qty, productId]
      );

      await conn.execute(
        `INSERT INTO stock_mutation_logs
          (product_id, mutation_type, reference_code, quantity_change, stock_after, notes, user_id)
         VALUES (?, 'penjualan', ?, ?, ?, ?, ?)`,
        [
          productId,
          invoiceCode,
          -Math.abs(qty),
          stockAfter,
          `Penjualan Kasir POS: ${invoiceCode}`,
          cashierId,
        ]
      );
    }

    await logAudit(
      {
        userId: cashierId,
        action: 'POS_CASH_TRANSACTION',
        endpoint: 'POST /api/transactions',
        description: `Transaksi penjualan tunai ${invoiceCode} sebesar Rp ${grandTotal.toLocaleString('id-ID')}`,
      },
      conn
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'Transaksi penjualan tunai berhasil diproses.',
      data: {
        id: transactionId,
        transaction_id: transactionId,
        invoice_code: invoiceCode,
        subtotal,
        discount,
        grand_total: grandTotal,
        paid_amount: paidAmount,
        change_amount: changeAmount,
        payment_method: 'cash',
        payment_status: 'settlement',
      },
    });
  } catch (error) {
    console.error(' --- Error Asli Transaksi --- ', error);
    await conn.rollback();
    return handleError(res, error, 'createCashTransaction');
  } finally {
    conn.release();
  }
};

// POST /api/transactions/charge-qris (Tagihan Pembayaran QRIS)
const createQrisTransaction = async (req, res) => {
  const cashierId = req.user?.id || req.user?.userId;
  if (!cashierId) return fail(res, 401, 'Identitas kasir tidak terdeteksi.');

  const body = req.body || {};
  const items = body.items;
  const discount = Number(body.discount || 0);

  const itemsError = validateItems(items);
  if (itemsError) return fail(res, 400, itemsError);
  if (!isNonNegNumber(discount)) return fail(res, 400, 'Nominal diskon tidak boleh negatif.');

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0
  );
  const grandTotal = subtotal - discount;

  if (grandTotal < 0) {
    return fail(res, 400, 'Diskon tidak boleh melebihi subtotal belanja.');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const invoiceCode = generateInvoiceCode();

    const [headerResult] = await conn.execute(
      `INSERT INTO transactions
        (invoice_code, subtotal, discount, grand_total, payment_method, payment_status, paid_at, cashier_id)
       VALUES (?, ?, ?, ?, 'qris', 'pending', NULL, ?)`,
      [invoiceCode, subtotal, discount, grandTotal, cashierId]
    );
    const transactionId = headerResult.insertId;

    for (const item of items) {
      const productId = Number(item.product_id);
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      const [prodRows] = await conn.execute(
        'SELECT name, purchase_price, current_stock FROM products WHERE id = ? FOR UPDATE',
        [productId]
      );
      if (prodRows.length === 0) {
        throw new HttpError(404, `Produk dengan ID ${productId} tidak ditemukan.`);
      }

      const product = prodRows[0];
      const currentStock = Number(product.current_stock);

      if (qty > currentStock) {
        throw new HttpError(
          400,
          `Stok produk ${product.name} tidak mencukupi (sisa: ${currentStock} unit)`
        );
      }

      const costPrice = Number(product.purchase_price);
      const itemSubtotal = qty * unitPrice;
      const stockAfter = currentStock - qty;

      await conn.execute(
        `INSERT INTO transaction_items
          (transaction_id, product_id, quantity, cost_price, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [transactionId, productId, qty, costPrice, unitPrice, itemSubtotal]
      );

      await conn.execute(
        'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
        [qty, productId]
      );

      await conn.execute(
        `INSERT INTO stock_mutation_logs
          (product_id, mutation_type, reference_code, quantity_change, stock_after, notes, user_id)
         VALUES (?, 'penjualan', ?, ?, ?, ?, ?)`,
        [
          productId,
          invoiceCode,
          -Math.abs(qty),
          stockAfter,
          `Penjualan Kasir POS (QRIS): ${invoiceCode}`,
          cashierId,
        ]
      );
    }

    await logAudit(
      {
        userId: cashierId,
        action: 'POS_QRIS_TRANSACTION',
        endpoint: 'POST /api/transactions/charge-qris',
        description: `Tagihan QRIS diterbitkan ${invoiceCode} sebesar Rp ${grandTotal.toLocaleString('id-ID')}`,
      },
      conn
    );

    await conn.commit();

    const qrString = `00020101021226600016ID.CO.SANDBOX.QRIS01189360091431234567890215${invoiceCode}520455335303360540${grandTotal}5802ID5915TOKO BAN VELG6007JAKARTA6304ABCD`;

    return res.status(201).json({
      success: true,
      message: 'Tagihan QRIS berhasil diterbitkan. Menunggu pembayaran.',
      data: {
        id: transactionId,
        transaction_id: transactionId,
        invoice_code: invoiceCode,
        subtotal,
        discount,
        grand_total: grandTotal,
        payment_method: 'qris',
        payment_status: 'pending',
        qr_string: qrString,
      },
    });
  } catch (error) {
    await conn.rollback();
    return handleError(res, error, 'createQrisTransaction');
  } finally {
    conn.release();
  }
};

// GET /api/transactions (Riwayat Transaksi Penjualan)
const getTransactions = async (req, res) => {
  try {
    const { payment_status, payment_method } = req.query;
    const where = [];
    const params = [];

    if (payment_status) {
      if (!PAYMENT_STATUSES.includes(payment_status)) {
        return fail(res, 400, 'Filter payment_status tidak valid.');
      }
      where.push('t.payment_status = ?');
      params.push(payment_status);
    }
    if (payment_method) {
      if (!PAYMENT_METHODS.includes(payment_method)) {
        return fail(res, 400, 'Filter payment_method tidak valid.');
      }
      where.push('t.payment_method = ?');
      params.push(payment_method);
    }

    let limit = 50;
    if (req.query.limit !== undefined && req.query.limit !== '') {
      if (!isPositiveInt(req.query.limit)) {
        return fail(res, 400, 'Parameter limit harus bilangan bulat positif.');
      }
      limit = Math.min(Number(req.query.limit), 500);
    }

    const [rows] = await db.query(
      `SELECT
         t.id,
         t.invoice_code,
         t.subtotal,
         t.discount,
         t.grand_total,
         t.payment_method,
         t.payment_status,
         t.payment_reference_id,
         t.paid_at,
         u.name AS cashier_name,
         t.created_at
       FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY t.id DESC
       LIMIT ?`,
      [...params, limit]
    );

    const formatted = rows.map((row) => ({
      ...row,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      grand_total: Number(row.grand_total),
    }));

    return res.status(200).json({
      success: true,
      message: 'Riwayat transaksi penjualan berhasil diambil.',
      data: formatted,
    });
  } catch (error) {
    return handleError(res, error, 'getTransactions');
  }
};

// GET /api/transactions/:id (Detail Nota & Cetak Struk)
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) {
      return fail(res, 404, 'Transaksi tidak ditemukan.');
    }

    const [trxRows] = await db.execute(
      `SELECT
         t.id,
         t.invoice_code,
         t.subtotal,
         t.discount,
         t.grand_total,
         t.payment_method,
         t.payment_status,
         t.payment_reference_id,
         t.paid_at,
         t.cashier_id,
         u.name AS cashier_name,
         t.created_at
       FROM transactions t
       JOIN users u ON t.cashier_id = u.id
       WHERE t.id = ?
       LIMIT 1`,
      [Number(id)]
    );

    if (trxRows.length === 0) {
      return fail(res, 404, 'Transaksi tidak ditemukan.');
    }

    const [itemRows] = await db.execute(
      `SELECT
         ti.id,
         ti.product_id,
         p.code AS product_code,
         p.name AS product_name,
         p.ring_size,
         p.specification,
         ti.quantity,
         ti.cost_price,
         ti.unit_price,
         ti.subtotal
       FROM transaction_items ti
       JOIN products p ON ti.product_id = p.id
       WHERE ti.transaction_id = ?
       ORDER BY ti.id ASC`,
      [Number(id)]
    );

    const header = trxRows[0];
    const items = itemRows.map((it) => ({
      ...it,
      quantity: Number(it.quantity),
      cost_price: Number(it.cost_price),
      unit_price: Number(it.unit_price),
      subtotal: Number(it.subtotal),
    }));

    return res.status(200).json({
      success: true,
      message: 'Detail nota transaksi berhasil diambil.',
      data: {
        ...header,
        subtotal: Number(header.subtotal),
        discount: Number(header.discount),
        grand_total: Number(header.grand_total),
        items,
      },
    });
  } catch (error) {
    return handleError(res, error, 'getTransactionById');
  }
};

module.exports = {
  createCashTransaction,
  createQrisTransaction,
  getTransactions,
  getTransactionById,
};

