const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

const fail = (res, status, message) => res.status(status).json({ success: false, message });

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isPositiveInt = (v) =>
  v !== '' && v !== null && v !== undefined && Number.isInteger(Number(v)) && Number(v) > 0;

const isNonNegInt = (v) =>
  v !== '' &&
  v !== null &&
  v !== undefined &&
  typeof v !== 'boolean' &&
  Number.isInteger(Number(v)) &&
  Number(v) >= 0;

const handleError = (res, error, label) => {
  if (error instanceof HttpError) return fail(res, error.status, error.message);
  if (error.code === 'ER_DUP_ENTRY') {
    return fail(res, 409, 'Kode pengajuan stock opname sudah terdaftar, silakan ulangi.');
  }
  console.error(`Kesalahan ${label}:`, error);
  return fail(res, 500, 'Terjadi kesalahan internal server');
};

// Pastikan kolom ENUM mutation_type pada stock_mutation_logs mendukung nilai 'penyesuaian'
(async () => {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM stock_mutation_logs LIKE 'mutation_type'");
    if (cols.length > 0) {
      const colType = String(cols[0].Type || cols[0].type || '');
      if (colType.toLowerCase().startsWith('enum(') && !colType.includes("'penyesuaian'")) {
        await db.query(
          "ALTER TABLE stock_mutation_logs MODIFY COLUMN mutation_type ENUM('masuk', 'keluar', 'penjualan', 'keluar_non_penjualan', 'adjustment_opname', 'penyesuaian') NOT NULL"
        );
      }
    }
  } catch (err) {
    console.warn('Info pemeriksaan skema stock_mutation_logs:', err.message);
  }
})();

// POST /api/stock-opnames — Pencatatan Hitung Fisik Opname (Role: Admin & Owner)
const createOpname = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return fail(res, 401, 'Identitas pengguna tidak terdeteksi.');

    const body = req.body || {};
    const { product_id, physical_stock } = body;
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

    if (!isPositiveInt(product_id)) {
      return fail(res, 400, 'Produk wajib dipilih.');
    }
    if (!isNonNegInt(physical_stock)) {
      return fail(
        res,
        400,
        'Stok fisik wajib berupa bilangan bulat 0 atau lebih (tidak boleh negatif).'
      );
    }

    const productId = Number(product_id);
    const physicalStock = Number(physical_stock);

    const [prodRows] = await db.execute(
      'SELECT id, name, current_stock FROM products WHERE id = ? LIMIT 1',
      [productId]
    );
    if (prodRows.length === 0) {
      return fail(res, 404, 'Produk tidak ditemukan.');
    }

    const product = prodRows[0];
    const systemStock = Number(product.current_stock);
    const difference = Number(physicalStock) - Number(systemStock);
    const opnameCode = `OPN-${Date.now().toString().slice(-8)}`;

    const [insertResult] = await db.execute(
      `INSERT INTO stock_opnames
        (opname_code, product_id, system_stock, physical_stock, notes, status, checked_by)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [opnameCode, productId, systemStock, physicalStock, notes, Number(userId)]
    );

    const opnameId = insertResult.insertId;

    await logAudit({
      userId: Number(userId),
      action: 'SUBMIT_STOCK_OPNAME',
      endpoint: '/api/stock-opnames',
      description: `Pengajuan stock opname ${opnameCode} untuk ${product.name} (Sistem: ${systemStock}, Fisik: ${physicalStock}, Selisih: ${difference})`,
    });

    return res.status(201).json({
      success: true,
      message:
        'Hasil perhitungan fisik stock opname berhasil diajukan dan menunggu persetujuan Owner.',
      data: {
        id: opnameId,
        opname_code: opnameCode,
        product_id: productId,
        system_stock: systemStock,
        physical_stock: physicalStock,
        difference,
        status: 'pending',
      },
    });
  } catch (error) {
    return handleError(res, error, 'createOpname');
  }
};

// PATCH /api/stock-opnames/:id/approve — Persetujuan Adjustment Opname (Role: Owner Eksklusif)
const approveOpname = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return fail(res, 401, 'Identitas pengguna tidak terdeteksi.');

  const { id } = req.params;
  if (!isPositiveInt(id)) {
    return fail(res, 404, 'Data pengajuan stock opname tidak ditemukan.');
  }

  const body = req.body || {};
  const approval_notes =
    typeof body.approval_notes === 'string'
      ? body.approval_notes.trim()
      : typeof body.owner_notes === 'string'
        ? body.owner_notes.trim()
        : '';

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Kunci baris opname
    const [opnameRows] = await conn.execute(
      'SELECT * FROM stock_opnames WHERE id = ? FOR UPDATE',
      [Number(id)]
    );
    if (opnameRows.length === 0) {
      throw new HttpError(404, 'Data pengajuan stock opname tidak ditemukan.');
    }

    const opname = opnameRows[0];
    if (opname.status !== 'pending') {
      throw new HttpError(400, 'Pengajuan opname ini sudah diproses sebelumnya.');
    }

    // 2. Kunci baris produk
    const productId = Number(opname.product_id);
    const [prodRows] = await conn.execute(
      'SELECT id, name, current_stock FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );
    if (prodRows.length === 0) {
      throw new HttpError(404, 'Produk terkait pengajuan opname tidak ditemukan.');
    }

    // Pastikan seluruh nilai numerik & string terdefinisi (tidak ada undefined)
    const systemStock = Number(opname.system_stock ?? prodRows[0].current_stock ?? 0);
    const physicalStock = Number(opname.physical_stock ?? 0);
    const difference =
      opname.difference !== undefined && opname.difference !== null
        ? Number(opname.difference)
        : physicalStock - systemStock;
    const referenceCode = String(opname.opname_code || `OPN-${opname.id}`);
    const mutationNotes = `[APPROVAL OPNAME] ${approval_notes || ''}`.trim().slice(0, 255);
    const actorUserId = Number(userId);

    // 3. Perbarui stok master produk mengikuti hasil hitung fisik opname
    await conn.execute('UPDATE products SET current_stock = ? WHERE id = ?', [
      physicalStock,
      productId,
    ]);

    // 4. Masukkan catatan mutasi ke tabel stock_mutation_logs
    try {
      await conn.execute(
        `INSERT INTO stock_mutation_logs
          (product_id, mutation_type, reference_code, quantity_change, stock_after, notes, user_id)
         VALUES (?, 'penyesuaian', ?, ?, ?, ?, ?)`,
        [
          productId,
          referenceCode,
          difference,
          physicalStock,
          mutationNotes,
          actorUserId,
        ]
      );
    } catch (mutErr) {
      // Fallback jika skema ENUM database masih menggunakan nama 'adjustment_opname'
      if (
        mutErr.code === 'WARN_DATA_TRUNCATED' ||
        mutErr.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' ||
        mutErr.errno === 1265
      ) {
        await conn.execute(
          `INSERT INTO stock_mutation_logs
            (product_id, mutation_type, reference_code, quantity_change, stock_after, notes, user_id)
           VALUES (?, 'adjustment_opname', ?, ?, ?, ?, ?)`,
          [
            productId,
            referenceCode,
            difference,
            physicalStock,
            mutationNotes,
            actorUserId,
          ]
        );
      } else {
        throw mutErr;
      }
    }

    // 5. Update status tabel stock_opnames menjadi approved
    await conn.execute(
      `UPDATE stock_opnames
       SET status = 'approved', approved_by = ?, approval_notes = ?, approved_at = NOW()
       WHERE id = ?`,
      [actorUserId, approval_notes || null, Number(id)]
    );

    // 6. Catat aksi ke audit_trails
    await logAudit(
      {
        userId: actorUserId,
        action: 'APPROVE_STOCK_OPNAME',
        endpoint: `/api/stock-opnames/${id}/approve`,
        description: `Menyetujui penyesuaian stock opname ${referenceCode}: stok sistem ${systemStock} -> fisik ${physicalStock} (selisih ${difference})`,
      },
      conn
    );

    await conn.commit();

    return res.status(200).json({
      success: true,
      message: 'Penyesuaian stok opname berhasil disetujui dan saldo inventori telah diperbarui.',
      data: {
        id: Number(id),
        opname_code: referenceCode,
        status: 'approved',
        previous_stock: systemStock,
        updated_stock: physicalStock,
        difference,
      },
    });
  } catch (error) {
    await conn.rollback();
    return handleError(res, error, 'approveOpname');
  } finally {
    conn.release();
  }
};

// PATCH /api/stock-opnames/:id/reject — Penolakan Adjustment Opname (Role: Owner Eksklusif)
const rejectOpname = async (req, res) => {
  const userId = req.user?.id || req.user?.userId;
  if (!userId) return fail(res, 401, 'Identitas pengguna tidak terdeteksi.');

  const { id } = req.params;
  if (!isPositiveInt(id)) {
    return fail(res, 404, 'Data pengajuan stock opname tidak ditemukan.');
  }

  const body = req.body || {};
  const rawNotes = body.approval_notes ?? body.owner_notes ?? '';
  const approvalNotes = typeof rawNotes === 'string' ? rawNotes.trim() : '';

  if (!approvalNotes) {
    return fail(res, 400, 'Alasan penolakan (approval_notes) wajib diisi.');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [opnameRows] = await conn.execute(
      'SELECT * FROM stock_opnames WHERE id = ? FOR UPDATE',
      [Number(id)]
    );
    if (opnameRows.length === 0) {
      throw new HttpError(404, 'Data pengajuan stock opname tidak ditemukan.');
    }

    const opname = opnameRows[0];
    if (opname.status !== 'pending') {
      throw new HttpError(400, 'Pengajuan opname ini sudah diproses sebelumnya.');
    }

    const actorUserId = Number(userId);

    // Update status menjadi rejected tanpa mengubah products.current_stock & tanpa stock_mutation_logs
    await conn.execute(
      `UPDATE stock_opnames
       SET status = 'rejected', approved_by = ?, approval_notes = ?, approved_at = NOW()
       WHERE id = ?`,
      [actorUserId, approvalNotes, Number(id)]
    );

    await logAudit(
      {
        userId: actorUserId,
        action: 'REJECT_STOCK_OPNAME',
        endpoint: `/api/stock-opnames/${id}/reject`,
        description: `Menolak pengajuan stock opname ${opname.opname_code}. Alasan: ${approvalNotes}`,
      },
      conn
    );

    await conn.commit();

    return res.status(200).json({
      success: true,
      message: 'Pengajuan penyesuaian stok opname telah ditolak oleh Owner.',
      data: {
        id: Number(id),
        status: 'rejected',
      },
    });
  } catch (error) {
    await conn.rollback();
    return handleError(res, error, 'rejectOpname');
  } finally {
    conn.release();
  }
};

// GET /api/stock-opnames — Daftar Riwayat Pengajuan Stock Opname (Role: Admin & Owner)
const getOpnames = async (req, res) => {
  try {
    const { status, product_id } = req.query;
    const where = [];
    const params = [];

    if (status !== undefined && status !== '') {
      if (!VALID_STATUSES.includes(status)) {
        return fail(
          res,
          400,
          "Filter status tidak valid. Gunakan 'pending', 'approved', atau 'rejected'."
        );
      }
      where.push('so.status = ?');
      params.push(status);
    }

    if (product_id !== undefined && product_id !== '') {
      if (!isPositiveInt(product_id)) {
        return fail(res, 400, 'Filter product_id tidak valid.');
      }
      where.push('so.product_id = ?');
      params.push(Number(product_id));
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
         so.id,
         so.opname_code,
         so.product_id,
         p.code AS product_code,
         p.name AS product_name,
         p.category,
         p.ring_size,
         so.system_stock,
         so.physical_stock,
         (so.physical_stock - so.system_stock) AS difference,
         so.notes,
         so.status,
         so.checked_by,
         u1.name AS checked_by_name,
         so.approved_by,
         u2.name AS approved_by_name,
         so.approval_notes,
         so.approved_at,
         so.created_at
       FROM stock_opnames so
       JOIN products p ON so.product_id = p.id
       JOIN users u1 ON so.checked_by = u1.id
       LEFT JOIN users u2 ON so.approved_by = u2.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY so.id DESC
       LIMIT ?`,
      [...params, limit]
    );

    const data = rows.map((row) => ({
      ...row,
      system_stock: Number(row.system_stock),
      physical_stock: Number(row.physical_stock),
      difference: Number(row.difference),
    }));

    return res.status(200).json({
      success: true,
      message: 'Daftar data stock opname berhasil diambil.',
      data,
    });
  } catch (error) {
    return handleError(res, error, 'getOpnames');
  }
};

// GET /api/stock-opnames/:id — Detail Pengajuan Stock Opname (Role: Admin & Owner)
const getOpnameById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isPositiveInt(id)) {
      return fail(res, 404, 'Data pengajuan stock opname tidak ditemukan.');
    }

    const [rows] = await db.execute(
      `SELECT
         so.id,
         so.opname_code,
         so.product_id,
         p.code AS product_code,
         p.name AS product_name,
         p.category,
         p.ring_size,
         so.system_stock,
         so.physical_stock,
         (so.physical_stock - so.system_stock) AS difference,
         so.notes,
         so.status,
         so.checked_by,
         u1.name AS checked_by_name,
         so.approved_by,
         u2.name AS approved_by_name,
         so.approval_notes,
         so.approved_at,
         so.created_at
       FROM stock_opnames so
       JOIN products p ON so.product_id = p.id
       JOIN users u1 ON so.checked_by = u1.id
       LEFT JOIN users u2 ON so.approved_by = u2.id
       WHERE so.id = ?
       LIMIT 1`,
      [Number(id)]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'Data pengajuan stock opname tidak ditemukan.');
    }

    const row = rows[0];
    return res.status(200).json({
      success: true,
      message: 'Detail pengajuan stock opname berhasil diambil.',
      data: {
        ...row,
        system_stock: Number(row.system_stock),
        physical_stock: Number(row.physical_stock),
        difference: Number(row.difference),
      },
    });
  } catch (error) {
    return handleError(res, error, 'getOpnameById');
  }
};

module.exports = {
  createOpname,
  approveOpname,
  rejectOpname,
  getOpnames,
  getOpnameById,
};