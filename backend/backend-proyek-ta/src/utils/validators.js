// Validasi bilangan bulat positif (> 0)
const isPositiveInt = (v) =>
  v !== '' &&
  v !== null &&
  v !== undefined &&
  String(v).trim() !== '' &&
  Number.isInteger(Number(v)) &&
  Number(v) > 0;

// Validasi bilangan bulat non-negatif (>= 0)
const isNonNegInt = (v) =>
  v !== '' &&
  v !== null &&
  v !== undefined &&
  typeof v !== 'boolean' &&
  Number.isInteger(Number(v)) &&
  Number(v) >= 0;

// Validasi angka desimal/bulat non-negatif (>= 0)
const isNonNegNumber = (v) =>
  v !== '' &&
  v !== null &&
  v !== undefined &&
  Number.isFinite(Number(v)) &&
  Number(v) >= 0;

// Validasi nominal uang positif (> 0)
const isValidAmount = (val) =>
  val !== '' &&
  val !== null &&
  val !== undefined &&
  typeof val !== 'boolean' &&
  Number.isFinite(Number(val)) &&
  Number(val) > 0;

// Validasi parameter ID URL hanya berisi digit angka
const isValidId = (id) => /^\d+$/.test(String(id));

// Validasi string tanggal berformat YYYY-MM-DD dan merupakan tanggal kalender yang valid
const isValidDateStr = (val) => {
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return false;
  }
  const clean = val.trim();
  const d = new Date(`${clean}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === clean;
};

const toYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Validasi & normalisasi rentang tanggal start_date dan end_date.
 * Mendukung pemanggilan resolveDateRange(queryObj) atau resolveDateRange(startStr, endStr).
 * Default: tanggal 1 bulan berjalan s.d. hari ini.
 * Jika start_date > end_date atau format tidak valid -> kembalikan { error }.
 */
const resolveDateRange = (startOrQuery = {}, endArg) => {
  const isQueryObj =
    startOrQuery !== null &&
    typeof startOrQuery === 'object' &&
    !Array.isArray(startOrQuery);

  const rawStartInput = isQueryObj ? startOrQuery.start_date : startOrQuery;
  const rawEndInput = isQueryObj ? startOrQuery.end_date : endArg;

  const now = new Date();
  const defaultStart = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
  const defaultEnd = toYMD(now);

  const rawStart =
    rawStartInput !== undefined && rawStartInput !== null && String(rawStartInput).trim() !== ''
      ? String(rawStartInput).trim()
      : defaultStart;
  const rawEnd =
    rawEndInput !== undefined && rawEndInput !== null && String(rawEndInput).trim() !== ''
      ? String(rawEndInput).trim()
      : defaultEnd;

  if (!isValidDateStr(rawStart) || !isValidDateStr(rawEnd) || rawStart > rawEnd) {
    return { error: 'Rentang tanggal filter tidak valid.' };
  }

  return { startDate: rawStart, endDate: rawEnd };
};

module.exports = {
  isPositiveInt,
  isNonNegInt,
  isNonNegNumber,
  isValidAmount,
  isValidId,
  isValidDateStr,
  toYMD,
  resolveDateRange,
};
