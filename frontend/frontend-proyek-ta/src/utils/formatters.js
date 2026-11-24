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

// Format tanggal ramah baca tanpa jam (contoh: "01 Nov 2026")
export const formatReadableDate = (dateVal) => {
  if (!dateVal) return '—';
  const clean = String(dateVal).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const d = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  const parsed = new Date(dateVal);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return clean;
};

// Konversi objek Date atau string tanggal ke format ISO YYYY-MM-DD lokal
export const toIsoDate = (dateVal = new Date()) => {
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

// Format tanggal hari ini (YYYY-MM-DD)
export const today = () => toIsoDate(new Date());

// Format tanggal 1 pada bulan berjalan atau bulan dari dateVal (YYYY-MM-01)
export const firstDayOfMonth = (dateVal = new Date()) => {
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// Normalisasi teks deskripsi jejak audit (pemisah ribuan Rupiah & istilah Stok Opname)
export const formatAuditDescription = (desc) => {
  if (!desc) return '—';
  return String(desc)
    .replace(
      /Rp\s*(\d{4,})(?![.,\d])/g,
      (_, digits) => 'Rp ' + Number(digits).toLocaleString('id-ID')
    )
    .replace(/Stock Opname/g, 'Stok Opname')
    .replace(/stock opname/g, 'stok opname');
};

// Kelas styling input form standar
export const inputCls = (hasErr) =>
  `w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none transition ${
    hasErr
      ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
  }`;
