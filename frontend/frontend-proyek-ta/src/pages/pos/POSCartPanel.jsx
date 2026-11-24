import {
  AlertTriangle,
  Banknote,
  Loader2,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  formatThousandDigits,
  parseDigits,
  rupiah,
} from '../../utils/formatters';

export default function POSCartPanel({
  draftCode,
  cashierName,
  cartItems,
  stockWarning,
  hasOverStock,
  totalUnits,
  subtotal,
  discount,
  onDiscountChange,
  grandTotal,
  qrisLoading,
  onClearCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onOpenCashModal,
  onChargeQris,
}) {
  return (
    <div className="w-full lg:w-[35%] lg:sticky lg:top-4 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Header Keranjang */}
      <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
        <div className="text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-blue-400">
              {draftCode}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-300 truncate mt-0.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Kasir: {cashierName}</span>
          </div>
        </div>

        {cartItems.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="h-7 px-2.5 rounded-md bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-[11px] font-semibold transition cursor-pointer shrink-0"
          >
            Kosongkan
          </button>
        )}
      </div>

      {/* Peringatan Batas Stok Fisik */}
      {(stockWarning || hasOverStock) && (
        <div className="m-3 mb-0 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {stockWarning ||
              'Terdapat item yang melebihi batas stok fisik yang tersedia.'}
          </span>
        </div>
      )}

      {/* Daftar Item Belanja */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-200/70">
        {cartItems.length === 0 ? (
          <div className="py-12 px-5 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-xs font-bold text-slate-700">
              Keranjang Kasir Kosong
            </div>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[230px] mx-auto leading-relaxed">
              Klik produk dari katalog di sebelah kiri untuk memulai transaksi
              baru
            </p>
          </div>
        ) : (
          cartItems.map((item) => {
            const lineTotal = item.quantity * Number(item.selling_price);
            const overLimit = item.quantity > item.current_stock;

            return (
              <div
                key={item.id}
                className="p-3 hover:bg-slate-50/70 transition text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      <span className="font-mono">{item.code}</span> •{' '}
                      {item.ring_size} • {rupiah(item.selling_price)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer shrink-0"
                    title="Hapus baris"
                    aria-label="Hapus baris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 mt-2">
                  {/* Stepper Kuantitas (- / +) */}
                  <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity - 1)
                      }
                      className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      aria-label="Kurangi"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.current_stock}
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(
                          item.id,
                          Math.max(1, parseInt(e.target.value, 10) || 1)
                        )
                      }
                      className="w-10 h-7 text-center font-sans tabular-nums text-xs font-bold text-slate-900 border-x border-slate-200 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity + 1)
                      }
                      className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      aria-label="Tambah"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-sans tabular-nums text-xs font-bold text-slate-900">
                      {rupiah(lineTotal)}
                    </div>
                    {overLimit && (
                      <div className="text-[10px] text-rose-600 font-semibold tabular-nums">
                        Maks {item.current_stock} unit
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ringkasan Belanja & Tombol Pembayaran */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 text-left">
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Total Item</span>
            <span className="font-sans tabular-nums font-semibold text-slate-900">
              {cartItems.length} jenis ({totalUnits} unit)
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-sans tabular-nums font-semibold text-slate-900">
              {rupiah(subtotal)}
            </span>
          </div>

          {/* Input Diskon (Rp) */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <label
              htmlFor="pos-discount"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 shrink-0"
            >
              Diskon (Rp)
            </label>
            <div className="relative w-40">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                Rp
              </span>
              <input
                id="pos-discount"
                type="text"
                inputMode="numeric"
                value={discount === 0 ? '' : formatThousandDigits(discount)}
                onChange={(e) => {
                  const raw = parseDigits(e.target.value);
                  onDiscountChange(
                    raw === '' ? 0 : Math.min(subtotal, Number(raw))
                  );
                }}
                placeholder="0"
                disabled={cartItems.length === 0}
                className="w-full h-8 pl-8 pr-2.5 bg-white border border-slate-300 rounded-lg text-right font-sans tabular-nums text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Total Tagihan Akhir */}
        <div className="pt-2.5 border-t border-slate-200 flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Total Tagihan
          </span>
          <span className="font-sans tabular-nums text-2xl font-bold text-slate-900">
            {rupiah(grandTotal)}
          </span>
        </div>

        {/* Tombol Aksi Pembayaran */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={cartItems.length === 0 || hasOverStock || qrisLoading}
            onClick={onOpenCashModal}
            className="h-11 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Banknote className="w-4 h-4 shrink-0" />
            <span>Bayar Tunai</span>
          </button>

          <button
            type="button"
            disabled={cartItems.length === 0 || hasOverStock || qrisLoading}
            onClick={onChargeQris}
            className="h-11 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {qrisLoading ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <QrCode className="w-4 h-4 shrink-0" />
            )}
            <span>Bayar QRIS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
