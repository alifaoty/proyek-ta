import { Loader2, ShieldCheck } from 'lucide-react';
import {
  formatAuditDescription,
  formatDateTime,
} from '../../../utils/formatters';

export function AuditActionBadge({ action }) {
  const act = String(action || '').toUpperCase();
  let cls = 'bg-slate-100 text-slate-700 border-slate-200';
  if (
    act.includes('CREATE') ||
    act.includes('INBOUND') ||
    act.includes('APPROVE')
  ) {
    cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (act.includes('DELETE') || act.includes('REJECT')) {
    cls = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (
    act.includes('UPDATE') ||
    act.includes('OUTBOUND') ||
    act.includes('OPNAME')
  ) {
    cls = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (act.includes('POS') || act.includes('LOGIN')) {
    cls = 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${cls}`}
    >
      {act || '—'}
    </span>
  );
}

export default function AuditTrailReportTab({ auditData, loading }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left">
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Log Jejak Audit Aktivitas Sistem (Audit Trail)
            </h2>
          </div>
        </div>
        <span className="text-[11px] font-sans tabular-nums text-slate-500">
          {auditData.logs?.length || 0} aktivitas tercatat
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-2.5 px-4">Waktu Kejadian</th>
              <th className="py-2.5 px-4">Pengguna &amp; Peran</th>
              <th className="py-2.5 px-4">Aksi &amp; Endpoint API</th>
              <th className="py-2.5 px-4">Deskripsi Aktivitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 text-xs">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                  <span>Memuat log jejak audit...</span>
                </td>
              </tr>
            ) : !auditData.logs?.length ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  Belum ada rekaman jejak audit pada periode tanggal ini.
                </td>
              </tr>
            ) : (
              auditData.logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/80 transition"
                >
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="font-sans tabular-nums font-semibold text-slate-900">
                      {formatDateTime(log.created_at)}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      #{log.id}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">
                      {log.user_name || 'Sistem'}
                    </div>
                    {log.user_role && (
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          log.user_role === 'owner'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {log.user_role}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <div>
                      <AuditActionBadge action={log.action} />
                    </div>
                    {log.endpoint && (
                      <div className="font-mono text-[11px] text-slate-500 mt-1">
                        {log.endpoint}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 max-w-md text-slate-700">
                    <div className="line-clamp-2 font-sans tabular-nums">
                      {formatAuditDescription(log.description)}
                    </div>
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
