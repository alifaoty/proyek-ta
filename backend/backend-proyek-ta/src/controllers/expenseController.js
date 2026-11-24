const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');
const { fail } = require('../utils/httpHelper');
const { isPositiveInt } = require('../utils/validators');

const VALID_CATEGORIES = [
  'listrik_air_internet',
  'perlengkapan_bengkel',
  'konsumsi_toko',
  'perawatan_alat',
  'lain_lain',
];

const VALIDATION_ERROR_MSG =
  'Nominal biaya harus lebih dari 0 dan kategori biaya wajib dipilih';

const formatIdr = (val) =>
  new Intl.NumberFormat('id-ID').format(Number(val || 0));

const isValidAmount = (val) =>
  val !== '' &&
  val !== null &&
  val !== undefined &&
  typeof val !== 'boolean' &&
  Number.isFinite(Number(val)) &&
  Number(val) > 0;

const isValidDate = (val) =>
  typeof val === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(val.trim()) &&
  !Number.isNaN(Date.parse(val.trim()));

// Pastikan tabel operational_expenses tersedia di database
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS operational_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        expense_code VARCHAR(50) NOT NULL UNIQUE,
        category ENUM(
          'listrik_air_internet',
          'gaji_karyawan',
          'sewa_tempat',
          'perlengkapan_bengkel',
          'konsumsi_toko',
          'perawatan_alat',
          'lain_lain'
        ) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        expense_date DATE NOT NULL,
        notes TEXT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_expense_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `);
  } catch (err) {
    console.warn('Info pemeriksaan tabel operational_expenses:', err.message);
  }
})();

// Generate kode unik: EXP-YYMMDD-XXXX (contoh: EXP-261123-0001)
const generateExpenseCode = async (expenseDate) => {
  const cleanDate = String(expenseDate || '').trim().replace(/-/g, '');
  const yymmdd =
    cleanDate.length === 8
      ? cleanDate.slice(2)
      : new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const prefix = `EXP-${yymmdd}-`;

  const [rows] = await db.execute(
    'SELECT expense_code FROM operational_expenses WHERE expense_code LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (rows.length > 0) {
    const parts = String(rows[0].expense_code).split('-');
    const lastSeq = parseInt(parts[2], 10);
    if (!Number.isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  const suffix =
    nextSeq <= 9999
      ? String(nextSeq).padStart(4, '0')
      : String(Math.floor(1000 + Math.random() * 9000));

  return `${prefix}${suffix}`;
};

// POST /api/expenses — Pencatatan Biaya Operasional Baru (Khusus Owner)
const createExpense = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return fail(res, 401, 'Identitas pengguna tidak terdeteksi.');

    const body = req.body || {};
    const { category, amount, expense_date, notes } = body;

    if (
      !VALID_CATEGORIES.includes(category) ||
      !isValidAmount(amount) ||
      !isValidDate(expense_date)
    ) {
      return fail(res, 400, VALIDATION_ERROR_MSG);
    }

    const cleanDate = expense_date.trim();
    const numericAmount = Number(amount);
    const cleanNotes =
      typeof notes === 'string' && notes.trim() !== '' ? notes.trim() : null;

    let expenseCode = await generateExpenseCode(cleanDate);
    let result;

    try {
      [result] = await db.execute(
        `INSERT INTO operational_expenses
          (expense_code, category, amount, expense_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          expenseCode,
          category,
          numericAmount,
          cleanDate,
          cleanNotes,
          Number(userId),
        ]
      );
    } catch (insertErr) {
      if (insertErr.code === 'ER_DUP_ENTRY') {
        const randSuffix = String(Math.floor(1000 + Math.random() * 9000));
        expenseCode = `${expenseCode.slice(0, 11)}${randSuffix}`;
        [result] = await db.execute(
          `INSERT INTO operational_expenses
            (expense_code, category, amount, expense_date, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            expenseCode,
            category,
            numericAmount,
            cleanDate,
            cleanNotes,
            Number(userId),
          ]
        );
      } else {
        throw insertErr;
      }
    }

    await logAudit({
      userId: Number(userId),
      action: 'CREATE_EXPENSE',
      endpoint: 'POST /api/expenses',
      description: `Mencatat biaya operasional ${expenseCode} (${category}) sebesar Rp ${formatIdr(numericAmount)}`,
    });

    return res.status(201).json({
      success: true,
      message: 'Data biaya operasional berhasil disimpan.',
      data: {
        id: result.insertId,
        expense_code: expenseCode,
        category,
        amount: numericAmount,
        expense_date: cleanDate,
        notes: cleanNotes,
        created_by: Number(userId),
      },
    });
  } catch (error) {
    console.error('Kesalahan createExpense:', error);
    return fail(res, 500, 'Terjadi kesalahan internal server');
  }
};

// GET /api/expenses — Daftar & Ringkasan Biaya Operasional (Khusus Owner)
const getExpenses = async (req, res) => {
  try {
    const { category, start_date, end_date } = req.query;
    const where = [];
    const params = [];

    if (category !== undefined && String(category).trim() !== '') {
      const cleanCategory = String(category).trim();
      if (!VALID_CATEGORIES.includes(cleanCategory)) {
        return fail(res, 400, 'Filter kategori biaya operasional tidak valid.');
      }
      where.push('oe.category = ?');
      params.push(cleanCategory);
    }

    if (start_date !== undefined && String(start_date).trim() !== '') {
      const cleanStart = String(start_date).trim();
      if (!isValidDate(cleanStart)) {
        return fail(res, 400, 'Format start_date harus YYYY-MM-DD.');
      }
      where.push('oe.expense_date >= ?');
      params.push(cleanStart);
    }

    if (end_date !== undefined && String(end_date).trim() !== '') {
      const cleanEnd = String(end_date).trim();
      if (!isValidDate(cleanEnd)) {
        return fail(res, 400, 'Format end_date harus YYYY-MM-DD.');
      }
      where.push('oe.expense_date <= ?');
      params.push(cleanEnd);
    }

    let limit = 100;
    if (req.query.limit !== undefined && String(req.query.limit).trim() !== '') {
      if (!isPositiveInt(req.query.limit)) {
        return fail(res, 400, 'Parameter limit harus bilangan bulat positif.');
      }
      limit = Math.min(Number(req.query.limit), 1000);
    }

    const sql = `
      SELECT
        oe.id,
        oe.expense_code,
        oe.category,
        oe.amount,
        DATE_FORMAT(oe.expense_date, '%Y-%m-%d') AS expense_date,
        oe.notes,
        oe.created_by,
        u.name AS created_by_name,
        oe.created_at,
        oe.updated_at
      FROM operational_expenses oe
      JOIN users u ON oe.created_by = u.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY oe.expense_date DESC, oe.id DESC
      LIMIT ?
    `;

    const [rows] = await db.query(sql, [...params, limit]);

    let totalAmount = 0;
    const categoryTotals = {};

    const formattedRows = rows.map((row) => {
      const amt = Number(row.amount || 0);
      totalAmount += amt;
      categoryTotals[row.category] = (categoryTotals[row.category] || 0) + amt;
      return {
        ...row,
        amount: amt,
      };
    });

    let topCategory = null;
    let maxCategoryAmount = -1;
    for (const [cat, sumAmt] of Object.entries(categoryTotals)) {
      if (sumAmt > maxCategoryAmount) {
        maxCategoryAmount = sumAmt;
        topCategory = cat;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Daftar biaya operasional berhasil diambil.',
      summary: {
        total_amount: totalAmount,
        total_records: formattedRows.length,
        top_category: topCategory,
      },
      data: formattedRows,
    });
  } catch (error) {
    console.error('Kesalahan getExpenses:', error);
    return fail(res, 500, 'Terjadi kesalahan internal server');
  }
};

// PUT /api/expenses/:id — Pembaruan Data Biaya Operasional (Khusus Owner)
const updateExpense = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return fail(res, 401, 'Identitas pengguna tidak terdeteksi.');

    const { id } = req.params;
    if (!isPositiveInt(id)) {
      return fail(res, 404, 'Data biaya operasional tidak ditemukan.');
    }

    const [existing] = await db.execute(
      'SELECT id, expense_code FROM operational_expenses WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    if (existing.length === 0) {
      return fail(res, 404, 'Data biaya operasional tidak ditemukan.');
    }

    const body = req.body || {};
    const { category, amount, expense_date, notes } = body;

    if (
      !VALID_CATEGORIES.includes(category) ||
      !isValidAmount(amount) ||
      !isValidDate(expense_date)
    ) {
      return fail(res, 400, VALIDATION_ERROR_MSG);
    }

    const cleanDate = expense_date.trim();
    const numericAmount = Number(amount);
    const cleanNotes =
      typeof notes === 'string' && notes.trim() !== '' ? notes.trim() : null;

    await db.execute(
      `UPDATE operational_expenses
       SET category = ?, amount = ?, expense_date = ?, notes = ?
       WHERE id = ?`,
      [category, numericAmount, cleanDate, cleanNotes, Number(id)]
    );

    await logAudit({
      userId: Number(userId),
      action: 'UPDATE_EXPENSE',
      endpoint: `PUT /api/expenses/${id}`,
      description: `Memperbarui biaya operasional ${existing[0].expense_code} (${category}) menjadi Rp ${formatIdr(numericAmount)}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Data biaya operasional berhasil diperbarui.',
      data: {
        id: Number(id),
        category,
        amount: numericAmount,
        expense_date: cleanDate,
        notes: cleanNotes,
      },
    });
  } catch (error) {
    console.error('Kesalahan updateExpense:', error);
    return fail(res, 500, 'Terjadi kesalahan internal server');
  }
};

// DELETE /api/expenses/:id — Penghapusan Data Biaya Operasional (Khusus Owner)
const deleteExpense = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return fail(res, 401, 'Identitas pengguna tidak terdeteksi.');

    const { id } = req.params;
    if (!isPositiveInt(id)) {
      return fail(res, 404, 'Data biaya operasional tidak ditemukan.');
    }

    const [existing] = await db.execute(
      'SELECT id, expense_code, amount FROM operational_expenses WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    if (existing.length === 0) {
      return fail(res, 404, 'Data biaya operasional tidak ditemukan.');
    }

    const { expense_code, amount } = existing[0];

    await db.execute('DELETE FROM operational_expenses WHERE id = ?', [
      Number(id),
    ]);

    await logAudit({
      userId: Number(userId),
      action: 'DELETE_EXPENSE',
      endpoint: `DELETE /api/expenses/${id}`,
      description: `Menghapus biaya operasional ${expense_code} sebesar Rp ${formatIdr(amount)}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Data biaya operasional berhasil dihapus.',
    });
  } catch (error) {
    console.error('Kesalahan deleteExpense:', error);
    return fail(res, 500, 'Terjadi kesalahan internal server');
  }
};

module.exports = {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
};
