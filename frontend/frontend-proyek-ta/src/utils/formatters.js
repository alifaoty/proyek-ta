// Format nominal mata uang Rupiah: "Rp 675.000"
export const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// Format tanggal & waktu lokal Indonesia (contoh: "16 Nov 2026, 17.50")
export const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format tanggal hari ini (YYYY-MM-DD)
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};
