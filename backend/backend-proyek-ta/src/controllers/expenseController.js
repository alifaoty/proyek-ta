const db = require('../config/database');
const { logAudit } = require('../utils/auditLogger');
const { generateExpenseCode } = require('../utils/codeGenerator');
const { formatIdr } = require('../utils/formatters');
const { fail, getActorId, handleControllerError } = require('../utils/httpHelper');
const { isPositiveInt, isValidAmount, isValidDateStr } = require('../utils/validators');

const VALID_CATEGORIES = [
  'listrik_air_internet',
  'perlengkapan_bengkel',
  'konsumsi_toko',
  'perawatan_alat',
  'lain_lain',
];

const VALIDATION_ERROR_MSG =
  'Nominal biaya harus lebih dari Rp 0 dan kategori biaya operasional wajib dipilih.';

// POST /api/expenses — Pencatatan Biaya Operasional Baru (Khusus Owner)
const createExpense = async (req, res) => {
  try {
    const userId = getActorId(req);
    if (!userId) return fail(res, 401, 'Identitas pengguna tidak terdeteksi.');

    const body = req.body || {};
    const { category, amount, expense_date, notes } = body;

    if (
      !VALID_CATEGORIES.includes(category) ||
      !isValidAmount(amount) ||
      !isValidDateStr(expense_date)
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
    return handleControllerError(res, error, 'createExpense');
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
      if (!isValidDateStr(cleanStart)) {
        return fail(res, 400, 'Format start_date harus YYYY-MM-DD.');
      }
      where.push('oe.expense_date >= ?');
      params.push(cleanStart);
    }

    if (end_date !== undefined && String(end_date).trim() !== '') {
      const cleanEnd = String(end_date).trim();
      if (!isValidDateStr(cleanEnd)) {
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
    return handleControllerError(res, error, 'getExpenses');
  }
};

// PUT /api/expenses/:id — Pembaruan Data Biaya Operasional (Khusus Owner)
const updateExpense = async (req, res) => {
  try {
    const userId = getActorId(req);
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
      !isValidDateStr(expense_date)
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
    return handleControllerError(res, error, 'updateExpense');
  }
};

// DELETE /api/expenses/:id — Penghapusan Data Biaya Operasional (Khusus Owner)
const deleteExpense = async (req, res) => {
  try {
    const userId = getActorId(req);
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
    return handleControllerError(res, error, 'deleteExpense');
  }
};

module.exports = {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
};
