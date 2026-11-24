import { CATEGORY_MAP } from '../constants/expenseConstants';

export function validateExpenseForm(form) {
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
}
