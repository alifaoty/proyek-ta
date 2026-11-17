import { Loader2 } from 'lucide-react';
import { rupiah } from '../../utils/formatters';

export default function InboundSummaryBar({
  totalTypes,
  totalUnits,
  totalAmount,
  saving,
}) {
  return (
    <div className="sticky bottom-3 z-10 bg-white border border-slate-200/90 rounded-xl shadow-md px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex flex-wrap items-center gap-6 text-left">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Jenis Barang
          </span>
          <b className="font-sans tabular-nums text-base font-bold text-slate-900">
            {totalTypes}
          </b>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total Unit
          </span>
          <b className="font-sans tabular-nums text-base font-bold text-slate-900">
            {totalUnits}
          </b>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total Nota
          </span>
          <b className="font-sans tabular-nums text-base font-bold text-blue-600">
            {rupiah(totalAmount)}
          </b>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold shadow-xs transition inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{saving ? 'Memproses...' : 'Bukukan Penerimaan Barang'}</span>
      </button>
    </div>
  );
}
