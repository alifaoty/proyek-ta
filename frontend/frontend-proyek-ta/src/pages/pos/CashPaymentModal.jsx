import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Banknote, Loader2, Printer, X } from "lucide-react";
import { createCashTransaction } from "../../api/transactionApi";
import { CASH_SHORTCUTS } from "../../constants/productConstants";
import {
  formatThousandDigits,
  parseDigits,
  rupiah,
} from "../../utils/formatters";

// Modal Pembayaran Tunai
export default function CashPaymentModal({
  grandTotal,
  subtotal,
  discount,
  cartItems,
  cashierName,
  paidAmount,
  setPaidAmount,
  onClose,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const paidNum = Number(paidAmount || 0);
  const changeAmount = paidNum - grandTotal;
  const isSufficient = paidNum >= grandTotal && grandTotal >= 0;

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!isSufficient) {
      setError("Uang pembayaran tunai kurang dari total belanja.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        payment_method: "cash",
        discount: Number(discount || 0),
        paid_amount: paidNum,
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: Number(item.selling_price),
        })),
      };
      const response = await createCashTransaction(payload);

      if (response.data?.success === true) {
        const resultData = response.data.data;
        onSuccess({
          invoice_code: resultData.invoice_code,
          created_at: new Date().toISOString(),
          cashier_name: cashierName,
          payment_method: "cash",
          payment_status: "settlement",
          subtotal,
          discount: Number(discount || 0),
          grand_total: grandTotal,
          paid_amount: paidNum,
          change_amount: resultData.change_amount ?? changeAmount,
          items: cartItems.map((it) => ({
            product_code: it.code,
            product_name: it.name,
            ring_size: it.ring_size,
            quantity: it.quantity,
            unit_price: Number(it.selling_price),
            subtotal: it.quantity * Number(it.selling_price),
          })),
        });
      } else {
        setError(
          response.data?.message ||
            "Gagal memproses transaksi pembayaran tunai.",
        );
        setSubmitting(false);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Gagal memproses transaksi pembayaran tunai.",
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
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-xl shadow-xl overflow-hidden font-sans text-left"
        noValidate
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Pembayaran Tunai
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

          {/* Ringkasan Total Tagihan */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Tagihan
            </span>
            <span className="font-sans tabular-nums text-xl font-bold text-white">
              {rupiah(grandTotal)}
            </span>
          </div>

          {/* Input Nominal Uang Diterima */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Nominal Uang Diterima (Rp){" "}
              <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                Rp
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={formatThousandDigits(paidAmount)}
                onChange={(e) => setPaidAmount(parseDigits(e.target.value))}
                disabled={submitting}
                className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-300 rounded-lg font-sans tabular-nums text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="0"
              />
            </div>

            {/* Tombol Shortcut Pecahan Uang */}
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              <button
                type="button"
                onClick={() =>
                  setPaidAmount(String(Math.round(Number(grandTotal || 0))))
                }
                className="h-8 px-2 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition cursor-pointer"
              >
                Uang Pas
              </button>
              {CASH_SHORTCUTS.map((sc) => (
                <button
                  key={sc.value}
                  type="button"
                  onClick={() => setPaidAmount(String(sc.value))}
                  className="h-8 px-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-sans tabular-nums text-[11px] font-semibold transition cursor-pointer"
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kalkulasi Kembalian Real-Time */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isSufficient
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isSufficient ? "Uang Kembalian" : "Kekurangan Bayar"}
            </span>
            <span className="font-sans tabular-nums text-lg font-bold">
              {rupiah(Math.abs(changeAmount))}
            </span>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !isSufficient}
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Proses Pembayaran &amp; Cetak Nota</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
