import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { createExpense, updateExpense } from '../../api/expenseApi';
import { EXPENSE_CATEGORIES } from '../../constants/expenseConstants';
import { validateExpenseForm } from '../../utils/expenseValidator';
import {
  formatThousandDigits,
  inputCls,
  parseDigits,
  today,
} from '../../utils/formatters';

export default function ExpenseFormModal({ expense, onClose, onSaved }) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validateExpenseForm(form);
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
              <label className="block text-xs font-semibold tracking-wider text-slate-600 mb-1.5">
                NOMINAL BIAYA (Rp) <span className="text-rose-600">*</span>
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
                  placeholder="0"
                  className={`${inputCls(errors.amount)} pl-9 font-sans tabular-nums font-semibold placeholder:text-slate-400 placeholder:font-normal`}
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
