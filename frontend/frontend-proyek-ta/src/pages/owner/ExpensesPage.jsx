import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Wallet,
} from 'lucide-react';
import { getExpenses } from '../../api/expenseApi';
import ToastNotification from '../../components/common/ToastNotification';
import { EXPENSE_CATEGORIES } from '../../constants/expenseConstants';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { formatReadableDate, rupiah } from '../../utils/formatters';
import ExpenseDeleteModal from './ExpenseDeleteModal';
import ExpenseFormModal from './ExpenseFormModal';
import ExpenseStatsBar, { CategoryBadge } from './ExpenseStatsBar';

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
  const { toast, showToast } = useToast();

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

  const topCategoryAmount = useMemo(() => {
    if (!summary.top_category) return 0;
    return expenses
      .filter((item) => item.category === summary.top_category)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses, summary.top_category]);

  if (user && user.role !== 'owner') {
    return <Navigate to="/unauthorized" replace />;
  }

  const hasActiveFilter = Boolean(categoryFilter || startDate || endDate);

  const handleResetFilters = () => {
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
  };

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
            <span>Catat Pengeluaran Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Bar (Grid 3 Kolom) */}
      <ExpenseStatsBar
        summary={summary}
        topCategoryAmount={topCategoryAmount}
      />

      {/* Baris Filter & Kontrol Satu Baris */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-3.5 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Dropdown Filter Kategori Beban */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <label
              htmlFor="expense-category-filter"
              className="text-xs font-semibold text-slate-600 whitespace-nowrap"
            >
              Kategori:
            </label>
            <select
              id="expense-category-filter"
              aria-label="Filter Kategori Beban"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition flex-1 sm:w-56"
            >
              <option value="">Semua Kategori Beban</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

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
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-sans tabular-nums text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            <span className="text-xs text-slate-400">s.d.</span>
            <input
              type="date"
              aria-label="Tanggal Akhir"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-sans tabular-nums text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
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
                      Klik tombol &ldquo;Catat Pengeluaran Baru&rdquo; untuk
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
                        {formatReadableDate(row.expense_date)}
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
            showToast(msg, 'success');
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
            showToast(msg, 'success');
            loadExpenses();
          }}
          onError={(msg) => {
            setDeleteTarget(null);
            showToast(msg, 'error');
          }}
        />
      )}

      <ToastNotification toast={toast} />
    </div>
  );
}
