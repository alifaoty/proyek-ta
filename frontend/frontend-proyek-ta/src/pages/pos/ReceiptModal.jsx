import { CheckCircle2, Printer, QrCode, RotateCcw } from "lucide-react";
import { formatDateTime, rupiah } from "../../utils/formatters";

// Modal Cetak Struk Nota & Tagihan QRIS
export default function ReceiptModal({ receipt, onNewTransaction }) {
  const isQris = receipt.payment_method === "qris";
  const statusLabel =
    receipt.payment_status === "settlement"
      ? "Lunas"
      : receipt.payment_status === "pending"
        ? "Menunggu"
        : receipt.payment_status;
  const methodLabel =
    String(receipt.payment_method || "").toLowerCase() === "cash"
      ? "Tunai"
      : receipt.payment_method;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden font-sans text-left my-auto">
        {/* Banner Status Sukses (disembunyikan saat print) */}
        <div className="px-5 py-3.5 bg-emerald-600 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-xs font-bold">
                {isQris
                  ? "Tagihan QRIS Diterbitkan"
                  : "Transaksi Berhasil Diproses"}
              </div>
              <div className="text-[11px] text-emerald-100 font-mono">
                {receipt.invoice_code}
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-emerald-100">
            {statusLabel}
          </span>
        </div>

        {/* Area Struk Nota Cetak */}
        <div
          id="pos-receipt-printable"
          className="p-5 text-xs text-slate-800 space-y-3"
        >
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <div className="text-sm font-bold uppercase tracking-tight text-slate-900">
              Toko Ban &amp; Velg
            </div>
            <div className="text-[11px] text-slate-500">
              Sistem Kasir POS &amp; Manajemen Inventori
            </div>
          </div>

          <div className="space-y-1 text-[11px] font-sans tabular-nums border-b border-dashed border-slate-300 pb-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Faktur:</span>
              <span className="font-mono font-bold text-slate-900">
                {receipt.invoice_code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tanggal:</span>
              <span className="text-right">
                {formatDateTime(receipt.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir:</span>
              <span className="text-right">{receipt.cashier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Metode Bayar:</span>
              <span className="uppercase font-semibold text-right">
                {methodLabel}
              </span>
            </div>
          </div>

          {/* Blok QRIS Sandbox bila metode QRIS */}
          {isQris && receipt.qr_string && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1.5">
              <QrCode className="w-20 h-20 text-slate-900 mx-auto" />
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Scan QRIS Sandbox Berikut
              </div>
              <div className="font-mono text-[10px] text-slate-500 break-all bg-white p-2 rounded border border-slate-200">
                {receipt.qr_string}
              </div>
            </div>
          )}

          {/* Daftar Item Belanja */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3 font-sans tabular-nums">
            {receipt.items.map((it, idx) => (
              <div key={idx} className="text-[11px]">
                <div className="font-semibold text-slate-900">
                  {it.product_name}{" "}
                  <span className="text-slate-500">({it.ring_size})</span>
                </div>
                <div className="flex justify-between items-baseline text-slate-600 mt-0.5">
                  <span>
                    {it.quantity} x {rupiah(it.unit_price)}
                  </span>
                  <span className="font-semibold text-slate-900 text-right tabular-nums">
                    {rupiah(it.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Ringkasan Pembayaran */}
          <div className="space-y-1 font-sans tabular-nums text-xs">
            <div className="flex justify-between items-baseline text-slate-600">
              <span>Subtotal</span>
              <span className="text-right tabular-nums">
                {rupiah(receipt.subtotal)}
              </span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between items-baseline text-rose-600">
                <span>Diskon</span>
                <span className="text-right tabular-nums">
                  - {rupiah(receipt.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL</span>
              <span className="text-right tabular-nums">
                {rupiah(receipt.grand_total)}
              </span>
            </div>
            {!isQris && (
              <>
                <div className="flex justify-between items-baseline text-slate-600 pt-1">
                  <span>Tunai Diterima</span>
                  <span className="text-right tabular-nums">
                    {rupiah(receipt.paid_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline font-bold text-emerald-700">
                  <span>Kembalian</span>
                  <span className="text-right tabular-nums">
                    {rupiah(receipt.change_amount)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-dashed border-slate-200">
            Terima kasih atas kunjungan Anda
          </div>
        </div>

        {/* Tombol Aksi Modal Nota */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
          <button
            type="button"
            onClick={onNewTransaction}
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
