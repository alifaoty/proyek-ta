// Format nominal mata uang Rupiah: "Rp 675.000"
export const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// Ekstrak hanya karakter digit (0-9) dari input nominal berformat ribuan
export const parseDigits = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  return String(val).replace(/\D/g, '');
};

// Format angka/digit menjadi string pemisah ribuan titik (contoh: "650000" atau "650000.00" -> "650.000")
export const formatThousandDigits = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  // Mitigasi nilai DECIMAL dari database (misal "650000.00") agar tidak berubah menjadi 100x lipat
  const normalized =
    typeof val === 'number' || /^\d+\.\d+$/.test(str)
      ? String(Math.round(Number(val)))
      : str;
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
};

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
