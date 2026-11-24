import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Loader2,
  Minus,
  PackageOpen,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { getProducts } from "../../api/productApi";
import { createQrisTransaction } from "../../api/transactionApi";
import SegmentedTabs from "../../components/common/SegmentedTabs";
import { POS_TABS as TABS } from "../../constants/productConstants";
import useAuth from "../../hooks/useAuth";
import {
  formatThousandDigits,
  parseDigits,
  rupiah,
} from "../../utils/formatters";
import CashPaymentModal from "./CashPaymentModal";
import POSProductCard from "./POSProductCard";
import ReceiptModal from "./ReceiptModal";

const makeDraftCode = () => `DRAFT-${Date.now().toString().slice(-6)}`;

const isSecondCondition = (cond) => cond === "second" || cond === "bekas";

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
    setPaidAmount(String(Math.round(Number(grandTotal || 0))));
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
                  <span>Penjualan (POS)</span>
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
                placeholder="Cari nama barang, kode SKU, atau ukuran ring..."
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
            <div className="pt-1 border-t border-slate-100 flex items-center justify-start">
              <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
            </div>
          </div>

          {/* Error Banner */}
          {loadError && (
            <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <span className="inline-flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Gagal memuat katalog produk POS.</span>
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
              {filteredProducts.map((p) => (
                <POSProductCard
                  key={p.id}
                  product={p}
                  inCartQty={cartQtyMap.get(p.id) || 0}
                  onSelect={addToCart}
                />
              ))}
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
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          <span className="font-mono">{item.code}</span> •{" "}
                          {item.ring_size} • {rupiah(item.selling_price)}
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
                          className="w-10 h-7 text-center font-sans tabular-nums text-xs font-bold text-slate-900 border-x border-slate-200 outline-none"
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
                    value={
                      discount === 0 ? "" : formatThousandDigits(discount)
                    }
                    onChange={(e) => {
                      const raw = parseDigits(e.target.value);
                      setDiscount(
                        raw === "" ? 0 : Math.min(subtotal, Number(raw)),
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
