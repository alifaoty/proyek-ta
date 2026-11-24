import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { getOpnames } from '../../api/stockOpnameApi';
import { DifferenceBadge } from '../../components/common/StatusBadges';
import useAuth from '../../hooks/useAuth';
import { formatDateTime } from '../../utils/formatters';
import OpnameReviewModal from './OpnameReviewModal';

export default function StockApprovalPage() {
  const { user } = useAuth();
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [toast, setToast] = useState('');

  // State modal konfirmasi: { mode: 'approve' | 'reject', item: Object } | null
  const [reviewTarget, setReviewTarget] = useState(null);

  const loadPendingOpnames = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await getOpnames({ status: 'pending' });
      setPendingList(res.data.data || []);
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          'Gagal memuat daftar pengajuan stok opname yang menunggu persetujuan.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'owner') {
      const timeoutId = setTimeout(() => loadPendingOpnames(), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [user, loadPendingOpnames]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Proteksi role Owner di level halaman
  if (user && user.role !== 'owner') {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleReviewSuccess = (message) => {
    setReviewTarget(null);
    setToast(message);
    loadPendingOpnames();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900 space-y-5">
      {/* Header Halaman & Indikator Jumlah Item Pending */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-left">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Persetujuan Stok Opname
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-sans tabular-nums font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {pendingList.length} Menunggu
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tinjau hasil perhitungan fisik staf gudang. Persetujuan akan
              langsung memperbarui stok master produk dan mencatat kartu stok.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadPendingOpnames}
          className="h-9 px-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang</span>
        </button>
      </div>

      {apiError && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Tabel Data Densitas Tinggi Khusus Status Pending */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left">
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Antrean Otorisasi Penyesuaian Stok (Khusus Owner)</span>
          </div>
          <span className="font-sans tabular-nums text-[11px] text-slate-300">
            Menampilkan: {pendingList.length} dokumen menunggu persetujuan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3.5">Dokumen &amp; Penginput</th>
                <th className="py-2.5 px-3.5">Nama Produk &amp; Ring</th>
                <th className="py-2.5 px-3.5 text-right">Stok Sistem</th>
                <th className="py-2.5 px-3.5 text-right">Hitung Fisik</th>
                <th className="py-2.5 px-3.5 text-center">Selisih</th>
                <th className="py-2.5 px-3.5">Catatan Staf</th>
                <th className="py-2.5 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                    <span>Memuat daftar pengajuan stok opname...</span>
                  </td>
                </tr>
              ) : pendingList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      Seluruh Pengajuan Stok Opname Telah Diproses
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Tidak ada antrean penyesuaian stok yang menunggu
                      persetujuan saat ini.
                    </div>
                  </td>
                </tr>
              ) : (
                pendingList.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">
                        {row.opname_code}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                        <span>{formatDateTime(row.created_at)}</span>
                        {' • '}
                        <span className="font-medium text-slate-700">
                          {row.checked_by_name || '—'}
                        </span>
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
                      <DifferenceBadge difference={row.difference} minusLabel="Kurang" />
                    </td>
                    <td className="py-2.5 px-3.5 max-w-[220px] text-slate-600">
                      <div className="line-clamp-2">
                        {row.notes || <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setReviewTarget({ mode: 'approve', item: row })
                          }
                          className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReviewTarget({ mode: 'reject', item: row })
                          }
                          className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfirmasi Approval / Rejection */}
      {reviewTarget && (
        <OpnameReviewModal
          mode={reviewTarget.mode}
          item={reviewTarget.item}
          onClose={() => setReviewTarget(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {toast && (
        <div className="fixed right-5 bottom-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
