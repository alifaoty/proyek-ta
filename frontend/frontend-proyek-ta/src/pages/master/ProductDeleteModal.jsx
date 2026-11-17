import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { deleteProduct } from '../../api/productApi';

const errMsg = (err, fallback) => err.response?.data?.message || fallback;

export default function ProductDeleteModal({ product, onClose, onDeleted, onError }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await deleteProduct(product.id);
      onDeleted('Produk berhasil dihapus');
    } catch (err) {
      onError(errMsg(err, 'Gagal menghapus produk'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-xl shadow-xl overflow-hidden font-sans text-left">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900">Hapus Produk</h2>
        </div>
        <div className="p-5 text-xs text-slate-600 leading-relaxed">
          Hapus <b className="font-mono text-slate-900">{product.code}</b> —{' '}
          <span className="font-medium text-slate-900">{product.name}</span>? Tindakan ini tidak
          dapat dibatalkan.
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
            onClick={onClose}
            disabled={busy}
          >
            Batal
          </button>
          <button
            type="button"
            className="h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            onClick={run}
            disabled={busy}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Hapus</span>
          </button>
        </div>
      </div>
    </div>
  );
}
