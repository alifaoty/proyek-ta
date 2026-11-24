// Format angka/desimal (termasuk string DECIMAL MySQL seperti "250000.00") ke pemisah ribuan Indonesia ("250.000")
const toSafeRoundedNumber = (val) => {
  if (val === '' || val === null || val === undefined || typeof val === 'boolean') {
    return 0;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
};

const formatIdr = (val) => toSafeRoundedNumber(val).toLocaleString('id-ID');

const formatRupiahText = (val) => 'Rp ' + formatIdr(val);

const normalizeAuditDescription = (desc) => {
  if (!desc) return desc;
  return String(desc)
    .replace(
      /Rp\s*(\d{4,})(?![.,\d])/g,
      (_, digits) => 'Rp ' + Number(digits).toLocaleString('id-ID')
    )
    .replace(/Stock Opname/g, 'Stok Opname')
    .replace(/stock opname/g, 'stok opname');
};

module.exports = {
  formatIdr,
  formatRupiahText,
  normalizeAuditDescription,
};
