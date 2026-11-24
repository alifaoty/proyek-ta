import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { deleteExpense } from '../../api/expenseApi';
import { rupiah } from '../../utils/formatters';
import { CategoryBadge } from './ExpenseStatsBar';

export default function ExpenseDeleteModal({
  expense,
  onClose,
  onDeleted,
  onError,
}) {
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
            Hapus Biaya Operasional?
          </h2>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-600">
          <p className="leading-relaxed">
            Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat
            dibatalkan.
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
            <span>{busy ? 'Menghapus...' : 'Ya, Hapus'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
