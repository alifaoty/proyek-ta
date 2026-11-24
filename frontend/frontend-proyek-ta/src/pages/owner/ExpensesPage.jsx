import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from '../../api/expenseApi';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import useAuth from '../../hooks/useAuth';
import {
  formatThousandDigits,
  parseDigits,
  rupiah,
  today,
} from '../../utils/formatters';

const EXPENSE_CATEGORIES = [
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

const CATEGORY_MAP = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c])
);

const EXPENSE_FILTER_TABS = [
  { key: '', label: 'Semua' },
  ...EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
];

const formatExpenseDate = (dateStr) => {
  if (!dateStr) return '—';
  const clean = String(dateStr).slice(0, 10);
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
  return clean;
};

function CategoryBadge({ category }) {
  const meta = CATEGORY_MAP[category];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${
        meta ? meta.badgeCls : 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {meta ? meta.label : category || '—'}
    </span>
  );
}

const inputCls = (hasErr) =>
  `w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none transition ${
    hasErr
      ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
  }`;

function ExpenseFormModal({ expense, onClose, onSaved }) {
  const isEdit = !!expense;
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          category: expense.category || 'perlengkapan_bengkel',
          amount: String(Math.round(Number(expense.amount || 0))),
          expense_date: String(expense.expense_date || today()).slice(0, 10),
          notes: expense.notes || '',
        }
      : {
          category: '',
          amount: '',
          expense_date: today(),
          notes: '',
        }
  );
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const next = {};
    if (!form.category || !CATEGORY_MAP[form.category]) {
      next.category = 'Kategori biaya operasional wajib dipilih.';
    }
    const amt = Number(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) {
      next.amount = 'Nominal biaya harus lebih dari Rp 0.';
    }
    if (!form.expense_date) {
      next.expense_date = 'Tanggal pengeluaran wajib diisi.';
    }
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    setApiError('');
    if (Object.keys(v).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        category: form.category,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        notes: form.notes.trim() || undefined,
      };
      if (isEdit) {
        const res = await updateExpense(expense.id, payload);
        onSaved(
          res.data?.message || 'Data biaya operasional berhasil diperbarui.'
        );
      } else {
        const res = await createExpense(payload);
        onSaved(
          res.data?.message || 'Data biaya operasional berhasil disimpan.'
        );
      }
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          'Gagal menyimpan data biaya operasional.'
      );
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-lg bg-white border border-slate-200/80 rounded-xl shadow-xl overflow-hidden font-sans text-left"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">
            {isEdit
              ? 'Edit Biaya Operasional'
              : 'Catat Pengeluaran Operasional Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {apiError && (
            <div className="px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Dropdown Kategori */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Kategori Biaya <span className="text-rose-600">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => {
                setForm((p) => ({ ...p, category: e.target.value }));
                setErrors((p) => ({ ...p, category: undefined }));
              }}
              className={inputCls(errors.category)}
            >
              <option value="">— Pilih kategori pengeluaran —</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <div className="text-xs text-red-600 font-medium mt-1">
                {errors.category}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Input Nominal dengan Prefix Rp & Pemisah Ribuan */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Nominal Biaya (Rp) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatThousandDigits(form.amount)}
                  onChange={(e) => {
                    const digits = parseDigits(e.target.value);
                    setForm((p) => ({ ...p, amount: digits }));
                    setErrors((p) => ({ ...p, amount: undefined }));
                  }}
                  placeholder="250.000"
                  className={`${inputCls(errors.amount)} pl-9 font-sans tabular-nums font-semibold`}
                />
              </div>
              {errors.amount && (
                <div className="text-xs text-red-600 font-medium mt-1">
                  {errors.amount}
                </div>
              )}
            </div>

            {/* Input Tanggal Pengeluaran */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Tanggal Pengeluaran <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => {
                  setForm((p) => ({ ...p, expense_date: e.target.value }));
                  setErrors((p) => ({ ...p, expense_date: undefined }));
                }}
                className={`${inputCls(errors.expense_date)} font-sans tabular-nums`}
              />
              {errors.expense_date && (
                <div className="text-xs text-red-600 font-medium mt-1">
                  {errors.expense_date}
                </div>
              )}
            </div>
          </div>

          {/* Textarea Rincian / Keterangan Nota */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Rincian / Keterangan Nota
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Contoh: Beli 5 strip timah balancing dan 1 tube lem tambal ban tubeless..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition resize-y"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {saving
                ? 'Menyimpan...'
                : isEdit
                  ? 'Simpan Perubahan'
                  : 'Simpan Pengeluaran'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

function ExpenseDeleteModal({ expense, onClose, onDeleted, onError }) {
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      const res = await deleteExpense(expense.id);
      onDeleted(
        res.data?.message || 'Data biaya operasional berhasil dihapus.'
      );
    } catch (err) {
      onError(
        err.response?.data?.message || 'Gagal menghapus data biaya operasional.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-xl shadow-xl overflow-hidden font-sans text-left">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">
            Hapus Catatan Biaya Operasional
          </h2>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-600">
          <p className="leading-relaxed">
            Apakah Anda yakin ingin menghapus catatan pengeluaran berikut?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Kode Dokumen:</span>
              <span className="font-mono font-bold text-slate-900">
                {expense.expense_code}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Kategori:</span>
              <CategoryBadge category={expense.category} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Nominal:</span>
              <span className="font-sans tabular-nums font-bold text-slate-900">
                {rupiah(expense.amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{busy ? 'Menghapus...' : 'Hapus Pengeluaran'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { user } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    total_amount: 0,
    total_records: 0,
    top_category: null,
  });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formModal, setFormModal] = useState(null); // null | { expense? }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await getExpenses(params);
      setExpenses(res.data?.data || []);
      setSummary(
        res.data?.summary || {
          total_amount: 0,
          total_records: 0,
          top_category: null,
        }
      );
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          'Gagal memuat daftar biaya operasional toko.'
      );
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, startDate, endDate]);

  useEffect(() => {
    if (user?.role === 'owner') {
      const t = setTimeout(() => loadExpenses(), 0);
      return () => clearTimeout(t);
    }
  }, [user, loadExpenses]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (user && user.role !== 'owner') {
    return <Navigate to="/unauthorized" replace />;
  }

  const hasActiveFilter = Boolean(categoryFilter || startDate || endDate);

  const handleResetFilters = () => {
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
  };

  const topCategoryLabel = summary.top_category
    ? CATEGORY_MAP[summary.top_category]?.label || summary.top_category
    : 'Belum ada data';

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900 space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-left">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Biaya Operasional
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola dan pantau seluruh pengeluaran operasional bengkel di luar
            pembelian stok barang (HPP).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadExpenses}
            className="h-10 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={() => setFormModal({})}
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pengeluaran Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Bar (Grid 3 Kolom) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {/* Kartu 1: Total Pengeluaran */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Pengeluaran (Periode Terfilter)
            </span>
            <div className="font-sans tabular-nums text-xl font-bold text-slate-900 mt-1">
              {rupiah(summary.total_amount)}
            </div>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Akumulasi beban operasional
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        {/* Kartu 2: Jumlah Catatan Beban */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Jumlah Catatan Beban
            </span>
            <div className="font-sans tabular-nums text-xl font-bold text-slate-900 mt-1">
              {summary.total_records}{' '}
              <span className="text-xs font-semibold text-slate-500">
                transaksi
              </span>
            </div>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Total dokumen pengeluaran tercatat
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* Kartu 3: Kategori Pengeluaran Terbesar */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Kategori Pengeluaran Terbesar
            </span>
            <div className="text-base font-bold text-slate-900 mt-1 truncate">
              {topCategoryLabel}
            </div>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Pos beban dengan nominal tertinggi
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Baris Filter & Kontrol */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-3.5 space-y-3 text-left">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Segmented Tabs Kategori */}
          <SegmentedTabs
            tabs={EXPENSE_FILTER_TABS}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />

          {/* Filter Rentang Tanggal & Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Periode:</span>
            </div>
            <input
              type="date"
              aria-label="Tanggal Mulai"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-sans tabular-nums text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            <span className="text-xs text-slate-400">s.d.</span>
            <input
              type="date"
              aria-label="Tanggal Akhir"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-sans tabular-nums text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {apiError && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Tabel Riwayat Pengeluaran (5 Kolom Padat tanpa Horizontal Scroll) */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">No Dokumen &amp; Tanggal</th>
                <th className="py-2.5 px-4">Kategori</th>
                <th className="py-2.5 px-4">Keterangan &amp; Pencatat</th>
                <th className="py-2.5 px-4 text-right">Nominal</th>
                <th className="py-2.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                    <span>Memuat data biaya operasional...</span>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Wallet className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                    <div className="font-semibold text-slate-700">
                      Belum Ada Catatan Biaya Operasional
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Klik tombol &ldquo;+ Catat Pengeluaran Baru&rdquo; untuk
                      mencatat pengeluaran toko.
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">
                        {row.expense_code}
                      </div>
                      <div className="font-sans tabular-nums text-[11px] text-slate-500 mt-0.5">
                        {formatExpenseDate(row.expense_date)}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <CategoryBadge category={row.category} />
                    </td>
                    <td className="py-2.5 px-4 max-w-md">
                      <div className="text-slate-800 line-clamp-2">
                        {row.notes || (
                          <span className="text-slate-400 italic">
                            Tanpa catatan tambahan
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Oleh:{' '}
                        <span className="font-medium text-slate-700">
                          {row.created_by_name || 'Owner'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {rupiah(row.amount)}
                    </td>
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFormModal({ expense: row })}
                          title="Edit"
                          aria-label="Edit"
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          title="Hapus"
                          aria-label="Hapus"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && expenses.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between font-medium">
            <span>
              Menampilkan{' '}
              <b className="font-sans tabular-nums text-slate-700">
                {expenses.length}
              </b>{' '}
              catatan pengeluaran
            </span>
            <span>
              Total:{' '}
              <b className="font-sans tabular-nums text-slate-900">
                {rupiah(summary.total_amount)}
              </b>
            </span>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {formModal && (
        <ExpenseFormModal
          expense={formModal.expense}
          onClose={() => setFormModal(null)}
          onSaved={(msg) => {
            setFormModal(null);
            setToast({ type: 'success', message: msg });
            loadExpenses();
          }}
        />
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <ExpenseDeleteModal
          expense={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(msg) => {
            setDeleteTarget(null);
            setToast({ type: 'success', message: msg });
            loadExpenses();
          }}
          onError={(msg) => {
            setDeleteTarget(null);
            setToast({ type: 'error', message: msg });
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed right-5 bottom-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold text-white shadow-lg ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
