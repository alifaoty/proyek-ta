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
  XCircle,
} from 'lucide-react';
import {
  approveOpname,
  getOpnames,
  rejectOpname,
} from '../../api/stockOpnameApi';
import useAuth from '../../hooks/useAuth';

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function DifferenceBadge({ difference }) {
  const diff = Number(difference || 0);
  if (diff < 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
        {diff} unit (Kurang)
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
        +{diff} unit (Lebih)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      0 unit (Sesuai)
    </span>
  );
}

// Modal Konfirmasi Setujui / Tolak Pengajuan Opname
function ReviewModal({ mode, item, onClose, onSuccess }) {
  const isApprove = mode === 'approve';
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async (e) => {
    e.preventDefault();
    const trimmed = approvalNotes.trim();

    if (!isApprove && !trimmed) {
      setError('Alasan penolakan wajib diisi sebelum menolak pengajuan.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      if (isApprove) {
        const res = await approveOpname(item.id, {
          approval_notes: trimmed || undefined,
        });
        onSuccess(
          res.data?.message ||
            'Penyesuaian stok opname berhasil disetujui.'
        );
      } else {
        const res = await rejectOpname(item.id, {
          approval_notes: trimmed,
        });
        onSuccess(
          res.data?.message ||
            'Pengajuan penyesuaian stok opname telah ditolak.'
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Gagal memproses keputusan persetujuan opname.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) =>
        e.target === e.currentTarget && !submitting && onClose()
      }
    >
      <form
        onSubmit={handleConfirm}
        noValidate
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-xl shadow-xl overflow-hidden font-sans text-left"
      >
        {/* Header Modal */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isApprove
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-rose-50/70 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
            <h2 className="text-sm font-bold text-slate-900">
              {isApprove
                ? 'Konfirmasi Setujui Penyesuaian Stok'
                : 'Konfirmasi Tolak Pengajuan Opname'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ringkasan Dokumen & Produk */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">No. Dokumen:</span>
              <span className="font-mono font-bold text-slate-900">
                {item.opname_code}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Produk:</span>
              <span className="font-semibold text-slate-900">
                {item.product_name} ({item.ring_size})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  Stok Sistem
                </div>
                <div className="font-mono font-bold text-sm text-slate-700 mt-0.5">
                  {item.system_stock}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  Hitung Fisik
                </div>
                <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">
                  {item.physical_stock}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  Selisih
                </div>
                <div
                  className={`font-mono font-bold text-sm mt-0.5 ${
                    item.difference < 0
                      ? 'text-rose-600'
                      : item.difference > 0
                        ? 'text-blue-600'
                        : 'text-slate-700'
                  }`}
                >
                  {item.difference > 0
                    ? `+${item.difference}`
                    : item.difference}
                </div>
              </div>
            </div>
          </div>

          {/* Info Dampak Keputusan */}
          <div
            className={`px-3.5 py-2.5 rounded-lg border text-xs ${
              isApprove
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {isApprove ? (
              <span>
                Saldo stok produk akan diperbarui dari{' '}
                <b className="font-mono">{item.system_stock}</b> menjadi{' '}
                <b className="font-mono">{item.physical_stock} unit</b> dan
                dicatat ke Kartu Stok (Mutasi Penyesuaian).
              </span>
            ) : (
              <span>
                Pengajuan akan ditandai <b>Ditolak (Rejected)</b>. Saldo stok
                sistem tetap utuh dan tidak mengalami perubahan.
              </span>
            )}
          </div>

          {/* Input Catatan Approval / Alasan Penolakan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {isApprove ? (
                'Catatan Persetujuan Owner (Opsional)'
              ) : (
                <>
                  Alasan Penolakan Owner{' '}
                  <span className="text-rose-600">*</span>
                </>
              )}
            </label>
            <textarea
              rows={3}
              autoFocus
              value={approvalNotes}
              onChange={(e) => {
                setApprovalNotes(e.target.value);
                if (error) setError('');
              }}
              disabled={submitting}
              placeholder={
                isApprove
                  ? 'Contoh: Selisih disetujui sesuai hasil pengecekan fisik gudang...'
                  : 'Wajib diisi, contoh: Hitung ulang rak belakang belum dimasukkan...'
              }
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition resize-y"
            />
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`h-9 px-4 rounded-lg text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isApprove
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : isApprove ? (
              <>
                <Check className="w-4 h-4" />
                <span>Setujui &amp; Sesuaikan Stok</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Tolak Pengajuan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

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
          'Gagal memuat daftar pengajuan opname yang menunggu persetujuan.'
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
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {pendingList.length} Pending
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
            <span>Antrean Otorisasi Penyesuaian Stok (Owner Only)</span>
          </div>
          <span className="font-mono text-[11px] text-slate-300">
            Menampilkan: {pendingList.length} dokumen pending
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">No Dokumen</th>
                <th className="py-3 px-4">Tanggal &amp; Jam</th>
                <th className="py-3 px-4">Staf Penginput</th>
                <th className="py-3 px-4">Nama Produk &amp; Ring</th>
                <th className="py-3 px-4 text-right">Stok Sistem</th>
                <th className="py-3 px-4 text-right">Hitung Fisik</th>
                <th className="py-3 px-4 text-center">Selisih Kuantitas</th>
                <th className="py-3 px-4">Catatan Staf</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                    <span>Memuat daftar pengajuan pending...</span>
                  </td>
                </tr>
              ) : pendingList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      Seluruh Pengajuan Opname Telah Diproses
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
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {row.opname_code}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {row.checked_by_name || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {row.product_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {row.product_code} • {row.ring_size}
                      </div>
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
                    <td className="py-3 px-4 max-w-xs text-slate-600">
                      {row.notes || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setReviewTarget({ mode: 'approve', item: row })
                          }
                          className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReviewTarget({ mode: 'reject', item: row })
                          }
                          className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
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
        <ReviewModal
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