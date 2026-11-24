import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export function DifferenceBadge({ difference, minusLabel = 'Kurang/Hilang' }) {
  const diff = Number(difference || 0);
  if (diff < 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans tabular-nums font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
        {diff} unit ({minusLabel})
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans tabular-nums font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
        +{diff} unit (Lebih)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans tabular-nums font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
      0 unit (Sesuai)
    </span>
  );
}

export function OpnameStatusBadge({ status }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        <span>Disetujui</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3" />
        <span>Ditolak</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" />
      <span>Menunggu</span>
    </span>
  );
}

export function MutationTypeBadge({ type }) {
  if (type === 'masuk') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Masuk
      </span>
    );
  }
  if (type === 'penjualan') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        Penjualan
      </span>
    );
  }
  if (type === 'keluar_non_penjualan') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Keluar Non-Penjualan
      </span>
    );
  }
  if (type === 'penyesuaian') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        Penyesuaian / Opname
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      {type || '—'}
    </span>
  );
}

export function StockChangeValue({ value }) {
  const num = Number(value || 0);
  if (num > 0) {
    return (
      <span className="font-sans tabular-nums font-bold text-emerald-600">
        +{num}
      </span>
    );
  }
  if (num < 0) {
    return (
      <span className="font-sans tabular-nums font-bold text-rose-600">
        {num}
      </span>
    );
  }
  return (
    <span className="font-sans tabular-nums font-semibold text-slate-500">
      0
    </span>
  );
}
