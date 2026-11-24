import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  PackageOpen,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createQrisTransaction } from '../../api/transactionApi';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import ToastNotification from '../../components/common/ToastNotification';
import { POS_TABS as TABS } from '../../constants/productConstants';
import useAuth from '../../hooks/useAuth';
import usePosCart from '../../hooks/usePosCart';
import useToast from '../../hooks/useToast';
import CashPaymentModal from './CashPaymentModal';
import POSCartPanel from './POSCartPanel';
import POSProductCard from './POSProductCard';
import ReceiptModal from './ReceiptModal';

const isSecondCondition = (cond) => cond === 'second' || cond === 'bekas';

export default function POSPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const {
    draftCode,
    cartItems,
    cartQtyMap,
    discount,
    setDiscount,
    discountNum,
    paidAmount,
    setPaidAmount,
    stockWarning,
    setStockWarning,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    grandTotal,
    totalUnits,
    hasOverStock,
  } = usePosCart();

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

  // Filter produk secara instan di sisi klien untuk responsivitas kasir
  const filteredProducts = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab);
    const kw = search.trim().toLowerCase();

    return products.filter((p) => {
      if (activeTab?.category && p.category !== activeTab.category)
        return false;
      if (activeTab?.condition) {
        if (
          activeTab.condition === 'bekas' &&
          !isSecondCondition(p.item_condition)
        )
          return false;
        if (activeTab.condition === 'baru' && p.item_condition !== 'baru')
          return false;
      }
      if (kw) {
        const haystack =
          `${p.code} ${p.name} ${p.ring_size} ${p.specification || ''}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [products, tab, search]);

  const handleClearCart = () => {
    clearCart();
    searchRef.current?.focus();
  };

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
    clearCart();
    loadCatalog();
  };

  // Pembayaran QRIS langsung
  const handleChargeQris = async () => {
    if (cartItems.length === 0 || hasOverStock) return;
    setQrisLoading(true);
    setStockWarning('');
    try {
      const payload = {
        payment_method: 'qris',
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
          cashier_name: user?.name || 'Kasir',
          payment_method: 'qris',
          payment_status: resultData.payment_status || 'pending',
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
          response.data?.message || 'Gagal menerbitkan tagihan QRIS.'
        );
      }
    } catch (err) {
      setStockWarning(
        err.response?.data?.message || 'Gagal menerbitkan tagihan QRIS.'
      );
    } finally {
      setQrisLoading(false);
    }
  };

  // Tombol "Transaksi Baru" di dalam modal struk
  const handleStartNewTransaction = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
    clearCart();
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
                  onClick={() => setSearch('')}
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
        <POSCartPanel
          draftCode={draftCode}
          cashierName={user?.name || 'Admin'}
          cartItems={cartItems}
          stockWarning={stockWarning}
          hasOverStock={hasOverStock}
          totalUnits={totalUnits}
          subtotal={subtotal}
          discount={discount}
          onDiscountChange={setDiscount}
          grandTotal={grandTotal}
          qrisLoading={qrisLoading}
          onClearCart={handleClearCart}
          onUpdateQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          onOpenCashModal={handleOpenCashModal}
          onChargeQris={handleChargeQris}
        />
      </div>

      {/* Modal Pembayaran Tunai */}
      {cashModalOpen && (
        <CashPaymentModal
          grandTotal={grandTotal}
          subtotal={subtotal}
          discount={discountNum}
          cartItems={cartItems}
          cashierName={user?.name || 'Kasir'}
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

      <ToastNotification toast={toast} />
    </div>
  );
}
