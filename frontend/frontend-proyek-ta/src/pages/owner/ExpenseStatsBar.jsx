import { FileText, TrendingUp, Wallet } from 'lucide-react';
import { CATEGORY_MAP } from '../../constants/expenseConstants';
import { rupiah } from '../../utils/formatters';

export function CategoryBadge({ category }) {
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

export default function ExpenseStatsBar({ summary, topCategoryAmount }) {
  const topCategoryLabel = summary.top_category
    ? CATEGORY_MAP[summary.top_category]?.label || summary.top_category
    : 'Belum ada data';

  return (
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
          <div className="text-base font-bold leading-snug line-clamp-2 text-slate-900 mt-1">
            {topCategoryLabel}
          </div>
          <span className="block text-[11px] font-sans tabular-nums text-slate-500 mt-0.5">
            {summary.top_category
              ? `Total ${rupiah(topCategoryAmount)}`
              : 'Pos beban dengan nominal tertinggi'}
          </span>
        </div>
        <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
