const db = require('../config/database');

// Format tanggal YYMMDD berdasarkan waktu server
const datePart = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

/**
 * Membuat nomor urut harian berikutnya (PREFIX-YYMMDD-XXXX) di dalam transaksi berjalan (INB- / OUT-).
 * Baris terakhir dikunci (FOR UPDATE) agar permintaan paralel tidak menghasilkan nomor yang sama.
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

/**
 * Generate kode unik biaya operasional: EXP-YYMMDD-XXXX (contoh: EXP-261123-0001)
 */
const generateExpenseCode = async (expenseDate, executor = db) => {
  const cleanDate = String(expenseDate || '').trim().replace(/-/g, '');
  const yymmdd =
    cleanDate.length === 8
      ? cleanDate.slice(2)
      : new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const prefix = `EXP-${yymmdd}-`;

  const [rows] = await executor.execute(
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

/**
 * Buat kode invoice unik: INV-XXXXXXXX (8 digit terakhir timestamp)
 */
const generateInvoiceCode = () => `INV-${Date.now().toString().slice(-8)}`;

/**
 * Buat kode pengajuan stok opname unik: OPN-XXXXXXXX (8 digit terakhir timestamp)
 */
const generateOpnameCode = () => `OPN-${Date.now().toString().slice(-8)}`;

module.exports = {
  datePart,
  generateNumber,
  generateExpenseCode,
  generateInvoiceCode,
  generateOpnameCode,
};
