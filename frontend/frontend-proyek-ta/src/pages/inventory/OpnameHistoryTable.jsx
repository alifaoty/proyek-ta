import { Loader2 } from 'lucide-react';
import SegmentedTabs from '../../components/common/SegmentedTabs';
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
            Riwayat Pengajuan Stok Opname
          </h2>
          <p className="text-[11px] text-slate-500">
            Daftar seluruh perhitungan fisik beserta status review dari Owner
          </p>
        </div>

        {/* Filter Tab Status */}
        <SegmentedTabs
          tabs={STATUS_TABS}
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2.5 px-3.5">No Opname &amp; Petugas</th>
              <th className="py-2.5 px-3.5">Produk &amp; Ring</th>
              <th className="py-2.5 px-3.5 text-right">Stok Sistem</th>
              <th className="py-2.5 px-3.5 text-right">Stok Fisik</th>
              <th className="py-2.5 px-3.5 text-center">Selisih Unit</th>
              <th className="py-2.5 px-3.5 text-center">Status</th>
              <th className="py-2.5 px-3.5">Catatan &amp; Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 text-xs">
            {loadingHistory ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                  <span>Memuat riwayat stok opname...</span>
                </td>
              </tr>
            ) : opnames.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  Belum ada data pengajuan stok opname.
                </td>
              </tr>
            ) : (
              opnames.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900">
                      {row.opname_code}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      <span>{formatDateTime(row.created_at)}</span>
                      {' • '}
                      <span>Oleh: {row.checked_by_name || '—'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-slate-900">
                      {row.product_name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                      <span className="font-mono">{row.product_code}</span> • {row.ring_size}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-sans tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                    {row.system_stock}
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-sans tabular-nums font-bold text-slate-900 whitespace-nowrap">
                    {row.physical_stock}
                  </td>
                  <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                    <DifferenceBadge difference={row.difference} />
                  </td>
                  <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-2.5 px-3.5 max-w-xs">
                    {row.approval_notes ? (
                      <div>
                        <div className="text-slate-800 font-medium">
                          {row.approval_notes}
                        </div>
                        {row.approved_by_name && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Review oleh: {row.approved_by_name}
                          </div>
                        )}
                      </div>
                    ) : row.notes ? (
                      <span className="text-slate-600 italic">
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
