export const RING_SIZES = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20'];

export const PRODUCT_TABS = [
  { key: 'all', label: 'Semua Produk' },
  { key: 'ban-baru', label: 'Ban Baru', category: 'ban', condition: 'baru' },
  { key: 'ban-bekas', label: 'Ban Bekas', category: 'ban', condition: 'bekas' },
  { key: 'velg-baru', label: 'Velg Baru', category: 'velg', condition: 'baru' },
  { key: 'velg-bekas', label: 'Velg Bekas', category: 'velg', condition: 'bekas' },
];

export const POS_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'ban-baru', label: 'Ban Baru', category: 'ban', condition: 'baru' },
  { key: 'ban-bekas', label: 'Ban Bekas', category: 'ban', condition: 'bekas' },
  { key: 'velg-baru', label: 'Velg Baru', category: 'velg', condition: 'baru' },
  { key: 'velg-bekas', label: 'Velg Bekas', category: 'velg', condition: 'bekas' },
];

export const CASH_SHORTCUTS = [
  { label: '100rb', value: 100000 },
  { label: '200rb', value: 200000 },
  { label: '500rb', value: 500000 },
  { label: '1 Juta', value: 1000000 },
];

export const OUTBOUND_REASONS = [
  { value: 'retur_rusak', label: 'Retur Rusak / Cacat Pabrik' },
  { value: 'pemakaian_internal', label: 'Pemakaian Internal Bengkel' },
  { value: 'peminjaman', label: 'Peminjaman Rekanan' },
  { value: 'hilang', label: 'Barang Hilang' },
];

export const MUTATION_FILTER_TABS = [
  { key: '', label: 'Semua Mutasi' },
  { key: 'masuk', label: 'Masuk' },
  { key: 'penjualan', label: 'Penjualan' },
  { key: 'keluar_non_penjualan', label: 'Keluar Non-Penjualan' },
  { key: 'penyesuaian', label: 'Penyesuaian / Opname' },
];

export const OPNAME_STATUS_TABS = [
  { key: '', label: 'Semua Status' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
];
