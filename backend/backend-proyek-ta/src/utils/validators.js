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

// Validasi parameter ID URL hanya berisi digit angka
const isValidId = (id) => /^\d+$/.test(String(id));

module.exports = {
  isPositiveInt,
  isNonNegInt,
  isNonNegNumber,
  isValidId,
};
