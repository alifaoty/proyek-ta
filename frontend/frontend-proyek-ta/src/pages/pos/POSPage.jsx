import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { getProducts } from "../../api/productApi";
import {
  createCashTransaction,
  createQrisTransaction,
} from "../../api/transactionApi";
import useAuth from "../../hooks/useAuth";

const TABS = [
  { key: "all", label: "Semua" },
  { key: "ban-baru", label: "Ban Baru", category: "ban", condition: "baru" },
  { key: "ban-bekas", label: "Ban Bekas", category: "ban", condition: "bekas" },
  { key: "velg-baru", label: "Velg Baru", category: "velg", condition: "baru" },
  {
    key: "velg-bekas",
    label: "Velg Bekas",
    category: "velg",
    condition: "bekas",
  },
];

const CASH_SHORTCUTS = [
  { label: "100rb", value: 100000 },
  { label: "200rb", value: 200000 },
  { label: "500rb", value: 500000 },
  { label: "1 Juta", value: 1000000 },
];

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const makeDraftCode = () => `DRAFT-${Date.now().toString().slice(-6)}`;

const isSecondCondition = (cond) => cond === "second" || cond === "bekas";

// Modal Pembayaran Tunai
function CashPaymentModal({
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
              Pembayaran Tunai (Cash)
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
            <span className="font-mono tabular-nums text-xl font-bold text-white">
              {rupiah(grandTotal)}
            </span>
          </div>

          {/* Input Nominal Uang Diterima */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Nominal Uang Diterima (Rp){" "}
              <span className="text-rose-600">*</span>
            </label>
            <input
              ref={inputRef}
              type="number"
              min={grandTotal}
              step="1000"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              disabled={submitting}
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg font-mono tabular-nums text-base font-bold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
              placeholder="Masukkan nominal uang tunai"
            />

            {/* Tombol Shortcut Pecahan Uang */}
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setPaidAmount(String(grandTotal))}
                className="h-8 px-2 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition cursor-pointer"
              >
                Uang Pas
              </button>
              {CASH_SHORTCUTS.map((sc) => (
                <button
                  key={sc.value}
                  type="button"
                  onClick={() => setPaidAmount(String(sc.value))}
                  className="h-8 px-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold transition cursor-pointer"
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
            <span className="font-mono tabular-nums text-lg font-bold">
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

// Modal Cetak Struk Nota & Tagihan QRIS
function ReceiptModal({ receipt, onNewTransaction }) {
  const isQris = receipt.payment_method === "qris";

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
            {receipt.payment_status}
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

          <div className="space-y-1 text-[11px] font-mono border-b border-dashed border-slate-300 pb-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Faktur:</span>
              <span className="font-bold text-slate-900">
                {receipt.invoice_code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tanggal:</span>
              <span>
                {new Date(receipt.created_at).toLocaleString("id-ID", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir:</span>
              <span>{receipt.cashier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Metode Bayar:</span>
              <span className="uppercase font-semibold">
                {receipt.payment_method}
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
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            {receipt.items.map((it, idx) => (
              <div key={idx} className="text-[11px]">
                <div className="font-semibold text-slate-900">
                  {it.product_name}{" "}
                  <span className="font-mono text-slate-500">
                    ({it.ring_size})
                  </span>
                </div>
                <div className="flex justify-between font-mono text-slate-600 mt-0.5">
                  <span>
                    {it.quantity} x {rupiah(it.unit_price)}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {rupiah(it.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Ringkasan Pembayaran */}
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{rupiah(receipt.subtotal)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Diskon</span>
                <span>- {rupiah(receipt.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL</span>
              <span>{rupiah(receipt.grand_total)}</span>
            </div>
            {!isQris && (
              <>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Tunai Diterima</span>
                  <span>{rupiah(receipt.paid_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Kembalian</span>
                  <span>{rupiah(receipt.change_amount)}</span>
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

export default function POSPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const [draftCode, setDraftCode] = useState(makeDraftCode);
  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState("");
  const [stockWarning, setStockWarning] = useState("");

  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [qrisLoading, setQrisLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const searchRef = useRef(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getProducts();
      setProducts(res.data.data || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadCatalog, 0);
    return () => clearTimeout(timer);
  }, [loadCatalog]);

  useEffect(() => {
    if (!stockWarning) return;
    const t = setTimeout(() => setStockWarning(""), 3200);
    return () => clearTimeout(t);
  }, [stockWarning]);

  // Filter produk secara instan di sisi klien untuk responsivitas kasir
  const filteredProducts = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab);
    const kw = search.trim().toLowerCase();

    return products.filter((p) => {
      if (activeTab?.category && p.category !== activeTab.category)
        return false;
      if (activeTab?.condition) {
        if (
          activeTab.condition === "bekas" &&
          !isSecondCondition(p.item_condition)
        )
          return false;
        if (activeTab.condition === "baru" && p.item_condition !== "baru")
          return false;
      }
      if (kw) {
        const haystack =
          `${p.code} ${p.name} ${p.ring_size} ${p.specification || ""}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [products, tab, search]);

  // Peta kuantitas item di keranjang
  const cartQtyMap = useMemo(
    () => new Map(cartItems.map((c) => [c.id, c.quantity])),
    [cartItems],
  );

  // Tambah produk saat kartu diklik
  const addToCart = (product) => {
    if (product.current_stock <= 0) return;
    setStockWarning("");

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.current_stock) {
          setStockWarning(
            `Stok ${product.name} tersisa ${product.current_stock} unit (batas maksimum tercapai).`,
          );
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // Ubah kuantitas item di keranjang
  const updateCartQty = (productId, nextQty) => {
    setStockWarning("");
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== productId) return item;
          if (nextQty <= 0) return null;
          if (nextQty > item.current_stock) {
            setStockWarning(
              `Kuantitas ${item.name} melebihi stok fisik (${item.current_stock} unit).`,
            );
            return { ...item, quantity: item.current_stock };
          }
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean),
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setPaidAmount("");
    setStockWarning("");
    setDraftCode(makeDraftCode());
    searchRef.current?.focus();
  };

  // Kalkulasi ringkasan keranjang
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.selling_price),
        0,
      ),
    [cartItems],
  );
  const discountNum = Math.max(0, Number(discount || 0));
  const grandTotal = Math.max(0, subtotal - discountNum);
  const totalUnits = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );
  const hasOverStock = useMemo(
    () => cartItems.some((item) => item.quantity > item.current_stock),
    [cartItems],
  );

  // Buka modal pembayaran tunai
  const handleOpenCashModal = () => {
    if (cartItems.length === 0 || hasOverStock) return;
    setPaidAmount(String(grandTotal));
    setCashModalOpen(true);
  };

  // Handler terpusat segera setelah transaksi berhasil disimpan ke backend
  const handleTransactionComplete = (receipt) => {
    setCashModalOpen(false);
    setReceiptData(receipt);
    setShowReceiptModal(true);

    // Reset state keranjang kasir untuk pelanggan berikutnya
    setCartItems([]);
    setDiscount(0);
    setPaidAmount("");
    setStockWarning("");
    setDraftCode(makeDraftCode());

    loadCatalog();
  };

  // Pembayaran QRIS langsung
  const handleChargeQris = async () => {
    if (cartItems.length === 0 || hasOverStock) return;
    setQrisLoading(true);
    setStockWarning("");
    try {
      const payload = {
        payment_method: "qris",
        discount: discountNum,
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: Number(item.selling_price),
        })),
      };
      const response = await createQrisTransaction(payload);

      if (response.data?.success === true) {
        const resultData = response.data.data;

        handleTransactionComplete({
          invoice_code: resultData.invoice_code,
          created_at: new Date().toISOString(),
          cashier_name: user?.name || "Kasir",
          payment_method: "qris",
          payment_status: resultData.payment_status || "pending",
          qr_string: resultData.qr_string,
          subtotal,
          discount: discountNum,
          grand_total: grandTotal,
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
        setStockWarning(
          response.data?.message || "Gagal menerbitkan tagihan QRIS.",
        );
      }
    } catch (err) {
      setStockWarning(
        err.response?.data?.message || "Gagal menerbitkan tagihan QRIS.",
      );
    } finally {
      setQrisLoading(false);
    }
  };

  // Tombol "Transaksi Baru" di dalam modal struk
  const handleStartNewTransaction = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
    setCartItems([]);
    setDiscount(0);
    setPaidAmount("");
    setStockWarning("");
    searchRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-5 text-slate-900">
      {/* Dual Panel Split Screen (65% Kiri / 35% Kanan pada Desktop) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* PANEL KIRI (65%): Katalog Barang & Filter Instan */}
        <div className="w-full lg:w-[65%] space-y-3 min-w-0">
          {/* Header & Toolbar Pencarian */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-left">
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <span>Terminal Kasir (POS)</span>
                </h1>
                <p className="text-[11px] text-slate-500">
                  Klik kartu produk untuk menambahkan ke keranjang belanja
                </p>
              </div>
              <button
                type="button"
                onClick={loadCatalog}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                title="Muat ulang stok"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan Stok</span>
              </button>
            </div>

            {/* Input Pencarian Langsung (autoFocus) */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari cepat nama ban/velg, kode SKU, atau ukuran ring (contoh: R15, BAN-001)..."
                className="w-full h-10 pl-9 pr-8 bg-slate-50/70 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Bersihkan pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Segmented Tabs Filter */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    tab === t.key
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {loadError && (
            <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <span className="inline-flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Gagal memuat katalog produk POS</span>
              </span>
              <button
                type="button"
                onClick={loadCatalog}
                className="h-8 px-3 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* Grid Kartu Produk */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-32 bg-white border border-slate-200/80 rounded-xl p-3.5 animate-pulse flex flex-col justify-between"
                >
                  <div className="h-3.5 w-24 bg-slate-200 rounded" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-1/2 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm py-12 px-4 text-center text-slate-500 text-xs">
              <PackageOpen className="w-9 h-9 text-slate-400 mx-auto mb-2" />
              <div>Tidak ada produk yang cocok dengan pencarian / filter.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {filteredProducts.map((p) => {
                const available = p.current_stock > 0;
                const inCartQty = cartQtyMap.get(p.id) || 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!available}
                    onClick={() => addToCart(p)}
                    className={`group relative bg-white border rounded-xl p-3.5 text-left transition flex flex-col justify-between gap-2.5 shadow-2xs ${
                      !available
                        ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                        : inCartQty > 0
                          ? "border-blue-600 ring-1 ring-blue-600 hover:shadow-md cursor-pointer"
                          : "border-slate-200/90 hover:border-blue-500 hover:shadow-sm cursor-pointer"
                    }`}
                  >
                    {/* Baris Atas: SKU, Ring, & Status Stok */}
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {p.code}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                          {p.ring_size}
                        </span>
                      </div>

                      {available ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 font-mono">
                          Stok: {p.current_stock}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          Habis
                        </span>
                      )}
                    </div>

                    {/* Nama Produk & Spesifikasi */}
                    <div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {p.specification ||
                          (p.category === "ban" ? "Ban" : "Velg")}{" "}
                        • {p.item_condition === "baru" ? "Baru" : "Bekas"}
                      </div>
                    </div>

                    {/* Harga Jual & Indikator Keranjang */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 w-full">
                      <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                        {rupiah(p.selling_price)}
                      </span>
                      {inCartQty > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold">
                          {inCartQty}x di keranjang
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* PANEL KANAN (35%): Keranjang Kasir & Panel Checkout */}
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
                <span className="truncate">Kasir: {user?.name || "Admin"}</span>
              </div>
            </div>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
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
                  "Terdapat item yang melebihi batas stok fisik yang tersedia."}
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
                  Klik produk dari katalog di sebelah kiri untuk memulai
                  transaksi baru
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
                        <div className="text-[11px] font-mono text-slate-500">
                          {item.code} • {item.ring_size} •{" "}
                          {rupiah(item.selling_price)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
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
                            updateCartQty(item.id, item.quantity - 1)
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
                            updateCartQty(
                              item.id,
                              Math.max(1, parseInt(e.target.value, 10) || 1),
                            )
                          }
                          className="w-10 h-7 text-center font-mono text-xs font-bold text-slate-900 border-x border-slate-200 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQty(item.id, item.quantity + 1)
                          }
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                          aria-label="Tambah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="font-mono tabular-nums text-xs font-bold text-slate-900">
                          {rupiah(lineTotal)}
                        </div>
                        {overLimit && (
                          <div className="text-[10px] text-rose-600 font-semibold">
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
                <span className="font-mono font-semibold text-slate-900">
                  {cartItems.length} jenis ({totalUnits} unit)
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
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
                <input
                  id="pos-discount"
                  type="number"
                  min="0"
                  max={subtotal}
                  step="1000"
                  value={discount === 0 ? "" : discount}
                  onChange={(e) =>
                    setDiscount(
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  placeholder="0"
                  disabled={cartItems.length === 0}
                  className="w-36 h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-right font-mono tabular-nums text-xs text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Total Tagihan Akhir */}
            <div className="pt-2.5 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Total Tagihan
              </span>
              <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">
                {rupiah(grandTotal)}
              </span>
            </div>

            {/* Tombol Aksi Pembayaran */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={cartItems.length === 0 || hasOverStock || qrisLoading}
                onClick={handleOpenCashModal}
                className="h-11 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Banknote className="w-4 h-4 shrink-0" />
                <span>Bayar Tunai</span>
              </button>

              <button
                type="button"
                disabled={cartItems.length === 0 || hasOverStock || qrisLoading}
                onClick={handleChargeQris}
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
      </div>

      {/* Modal Pembayaran Tunai */}
      {cashModalOpen && (
        <CashPaymentModal
          grandTotal={grandTotal}
          subtotal={subtotal}
          discount={discountNum}
          cartItems={cartItems}
          cashierName={user?.name || "Kasir"}
          paidAmount={paidAmount}
          setPaidAmount={setPaidAmount}
          onClose={() => setCashModalOpen(false)}
          onSuccess={handleTransactionComplete}
        />
      )}

      {/* Modal Cetak Struk Nota */}
      {showReceiptModal && receiptData && (
        <ReceiptModal
          receipt={receiptData}
          onNewTransaction={handleStartNewTransaction}
        />
      )}
    </div>
  );
}