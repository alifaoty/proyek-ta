export const EXPENSE_CATEGORIES = [
  {
    key: 'listrik_air_internet',
    label: 'Listrik, Air & Internet',
    badgeCls: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    key: 'perlengkapan_bengkel',
    label: 'Perlengkapan Bengkel',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    key: 'konsumsi_toko',
    label: 'Konsumsi Toko',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'perawatan_alat',
    label: 'Perawatan Alat',
    badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    key: 'lain_lain',
    label: 'Lain-lain',
    badgeCls: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c])
);

export const EXPENSE_CATEGORY_LABELS = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c.label])
);
