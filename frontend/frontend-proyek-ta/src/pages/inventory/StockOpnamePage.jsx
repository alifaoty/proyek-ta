import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Send } from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createOpname, getOpnames } from '../../api/stockOpnameApi';
import { DifferenceBadge } from '../../components/common/StatusBadges';
import ToastNotification from '../../components/common/ToastNotification';
import useToast from '../../hooks/useToast';
import { validateOpnameForm } from '../../utils/inventoryValidator';
import OpnameHistoryTable from './OpnameHistoryTable';
import ProductSearchCombobox from './ProductSearchCombobox';

export default function StockOpnamePage() {
  const [products, setProducts] = useState([]);
  const [opnames, setOpnames] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [productId, setProductId] = useState('');
  const [physicalStock, setPhysicalStock] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  const loadOpnames = useCallback(
    async (isMounted = () => true) => {
      if (isMounted()) setLoadingHistory(true);
      try {
        const params = statusFilter ? { status: statusFilter } : {};
        const res = await getOpnames(params);
        if (isMounted()) setOpnames(res.data.data || []);
      } catch {
        if (isMounted()) setApiError('Gagal memuat riwayat stok opname.');
      } finally {
        if (isMounted()) setLoadingHistory(false);
      }
    },
    [statusFilter]
  );

  const loadProducts = useCallback(async (isMounted = () => true) => {
    try {
      const res = await getProducts();
      if (isMounted()) setProducts(res.data.data || []);
    } catch {
      if (isMounted()) setApiError('Gagal memuat katalog produk.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      loadProducts(() => active);
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadProducts]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      loadOpnames(() => active);
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadOpnames]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)) || null,
    [products, productId]
  );

  // Kalkulasi selisih real-time (stok fisik - stok sistem)
  const hasPhysicalInput =
    physicalStock !== '' &&
    physicalStock !== null &&
    !Number.isNaN(Number(physicalStock)) &&
    Number(physicalStock) >= 0;

  const realtimeDifference = useMemo(() => {
    if (!selectedProduct || !hasPhysicalInput) return null;
    return Number(physicalStock) - Number(selectedProduct.current_stock);
  }, [selectedProduct, hasPhysicalInput, physicalStock]);

  const handleSelectProduct = (product) => {
    setProductId(product ? String(product.id) : '');
    if (product) {
      setErrors((prev) => ({ ...prev, product_id: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateOpnameForm({ productId, physicalStock });

    setErrors(nextErrors);
    setApiError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        product_id: Number(productId),
        physical_stock: Number(physicalStock),
        notes: notes.trim() || undefined,
      };
      const res = await createOpname(payload);
      showToast(
        `${res.data.message} (${res.data.data?.opname_code || 'Menunggu Persetujuan'})`
      );
      setProductId('');
      setPhysicalStock('');
      setNotes('');
      loadOpnames();
      loadProducts();
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          'Gagal mengirim pengajuan stok opname.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-left">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Stok Opname</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catat hasil audit hitung fisik di rak gudang. Selisih stok hanya akan
            mengubah saldo inventori setelah disetujui oleh Owner.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadProducts();
            loadOpnames();
          }}
          className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {apiError && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* BAGIAN ATAS: Form Input Hasil Hitung Fisik */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left"
      >
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Form Input Hasil Hitung Fisik Gudang
          </span>
          <span className="text-[11px] text-slate-400">
            Status Awal: <b className="text-amber-600">MENUNGGU PERSETUJUAN</b>
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Kolom Kiri: Searchable Combobox Pemilihan Produk */}
          <div className="lg:col-span-6">
            <ProductSearchCombobox
              products={products}
              selectedProduct={selectedProduct}
              onSelect={handleSelectProduct}
              disabled={submitting}
              error={errors.product_id}
            />
          </div>

          {/* Kolom Kanan: Input Stok Fisik, Indikator Selisih, & Catatan */}
          <div className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Input Angka Stok Fisik */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 truncate">
                  Stok Fisik Aktual di Rak{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={physicalStock}
                  onChange={(e) => {
                    setPhysicalStock(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      physical_stock: undefined,
                    }));
                  }}
                  placeholder="Contoh: 10"
                  className={`w-full h-10 px-3 bg-white border rounded-lg font-sans tabular-nums text-sm font-bold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-xs placeholder:text-slate-400 outline-none transition ${
                    errors.physical_stock
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                {errors.physical_stock && (
                  <div className="text-xs text-rose-600 font-medium mt-1">
                    {errors.physical_stock}
                  </div>
                )}
              </div>

              {/* Selisih Stok */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 truncate">
                  Selisih Stok
                </span>
                <div className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center whitespace-nowrap overflow-hidden">
                  {realtimeDifference === null ? (
                    <span className="text-xs text-slate-400 whitespace-nowrap truncate">
                      Pilih produk &amp; isi stok fisik
                    </span>
                  ) : (
                    <span className="whitespace-nowrap inline-flex">
                      <DifferenceBadge difference={realtimeDifference} />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Textarea Catatan / Keterangan Kondisi Barang */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Catatan / Keterangan Kondisi Barang
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pengecekan rutin rak ban R15 depan, ditemukan selisih fisik..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition resize-y"
              />
            </div>
          </div>
        </div>

        {/* Footer Tombol Submit */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim Pengajuan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Pengajuan Stok Opname ke Owner</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* BAGIAN BAWAH: Tabel Riwayat Opname */}
      <OpnameHistoryTable
        opnames={opnames}
        loadingHistory={loadingHistory}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          if (val !== statusFilter) setLoadingHistory(true);
          setStatusFilter(val);
        }}
      />

      <ToastNotification toast={toast} />
    </div>
  );
}
