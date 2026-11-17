import { Loader2 } from 'lucide-react';
import {
  DifferenceBadge,
  OpnameStatusBadge as StatusBadge,
} from '../../components/common/StatusBadges';
import { OPNAME_STATUS_TABS as STATUS_TABS } from '../../constants/productConstants';
import { formatDateTime } from '../../utils/formatters';

export default function OpnameHistoryTable({
  opnames,
  loadingHistory,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left">
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Riwayat Pengajuan Stock Opname
          </h2>
          <p className="text-[11px] text-slate-500">
            Daftar seluruh perhitungan fisik beserta status review dari Owner
          </p>
        </div>

        {/* Filter Tab Status */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onStatusFilterChange(t.key)}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                statusFilter === t.key
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">No Opname</th>
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Produk &amp; Ring</th>
              <th className="py-3 px-4">Petugas</th>
              <th className="py-3 px-4 text-right">Stok Sistem</th>
              <th className="py-3 px-4 text-right">Stok Fisik</th>
              <th className="py-3 px-4 text-center">Selisih Unit</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4">Catatan Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 text-xs">
            {loadingHistory ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                  <span>Memuat riwayat stock opname...</span>
                </td>
              </tr>
            ) : opnames.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400">
                  Belum ada data pengajuan stock opname.
                </td>
              </tr>
            ) : (
              opnames.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {row.opname_code}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">
                      {row.product_name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {row.product_code} • {row.ring_size}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                    {row.checked_by_name || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-700">
                    {row.system_stock}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                    {row.physical_stock}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <DifferenceBadge difference={row.difference} />
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    {row.approval_notes ? (
                      <div>
                        <div className="text-slate-800 font-medium">
                          {row.approval_notes}
                        </div>
                        {row.approved_by_name && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Oleh: {row.approved_by_name}
                          </div>
                        )}
                      </div>
                    ) : row.notes ? (
                      <span className="text-slate-500 italic">
                        Catatan staf: {row.notes}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
