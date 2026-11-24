import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import { approveOpname, rejectOpname } from '../../api/stockOpnameApi';

// Modal Konfirmasi Setujui / Tolak Pengajuan Opname
export default function OpnameReviewModal({ mode, item, onClose, onSuccess }) {
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
          'Gagal memproses keputusan persetujuan stok opname.'
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
                ? 'Konfirmasi Setujui Stok Opname'
                : 'Konfirmasi Tolak Stok Opname'}
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
                <div className="font-sans tabular-nums font-bold text-sm text-slate-700 mt-0.5">
                  {item.system_stock}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  Hitung Fisik
                </div>
                <div className="font-sans tabular-nums font-bold text-sm text-slate-900 mt-0.5">
                  {item.physical_stock}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  Selisih
                </div>
                <div
                  className={`font-sans tabular-nums font-bold text-sm mt-0.5 ${
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
                <b className="font-sans tabular-nums">{item.system_stock}</b> menjadi{' '}
                <b className="font-sans tabular-nums">{item.physical_stock} unit</b> dan
                dicatat ke Kartu Stok (Mutasi Penyesuaian).
              </span>
            ) : (
              <span>
                Pengajuan akan ditandai <b>Ditolak</b>. Saldo stok
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
