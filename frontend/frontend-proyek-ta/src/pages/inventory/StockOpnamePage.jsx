import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  X,
} from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createOpname, getOpnames } from '../../api/stockOpnameApi';
import { DifferenceBadge } from '../../components/common/StatusBadges';
import { validateOpnameForm } from '../../utils/inventoryValidator';
import OpnameHistoryTable from './OpnameHistoryTable';

export default function StockOpnamePage() {
  const [products, setProducts] = useState([]);
  const [opnames, setOpnames] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [physicalStock, setPhysicalStock] = useState('');
  const [notes, setNotes] = useState('');

  const comboboxRef = useRef(null);
  const searchInputRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Tutup dropdown combobox saat klik di luar area combobox
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter daftar produk pada dropdown berdasarkan teks pencarian
  const filteredProducts = useMemo(() => {
    const kw = productSearch.trim().toLowerCase();
    if (!kw) return products;
    return products.filter((p) =>
      `${p.code} ${p.name} ${p.ring_size} ${p.specification || ''}`
        .toLowerCase()
        .includes(kw)
    );
  }, [products, productSearch]);

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
      setToast(
        `${res.data.message} (${res.data.data?.opname_code || 'Pending'})`
      );
      setProductId('');
      setPhysicalStock('');
      setNotes('');
      setProductSearch('');
      setDropdownOpen(false);
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
            Status Awal: <b className="text-amber-600">PENDING APPROVAL</b>
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Kolom Kiri: Searchable Combobox Pemilihan Produk */}
          <div className="lg:col-span-6 space-y-3">
            <div ref={comboboxRef} className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Cari &amp; Pilih Produk Ban / Velg{' '}
                <span className="text-rose-600">*</span>
              </label>

              {selectedProduct ? (
                /* Tampilan Terpilih dengan Tombol Reset (X) 1-Klik */
                <div
                  className={`w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 flex items-center justify-between gap-2 transition ${
                    errors.product_id
                      ? 'border-rose-500 ring-2 ring-rose-100'
                      : 'border-blue-600 ring-2 ring-blue-100/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 shrink-0">
                      {selectedProduct.code}
                    </span>
                    <span className="font-semibold text-slate-900 truncate">
                      {selectedProduct.name}
                    </span>
                    <span className="font-sans tabular-nums text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                      {selectedProduct.ring_size}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProductId('');
                      setProductSearch('');
                      setDropdownOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 0);
                    }}
                    title="Ganti produk"
                    aria-label="Ganti produk"
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Input Combobox Pencarian Terpadu */
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={productSearch}
                    onFocus={() => setDropdownOpen(true)}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setDropdownOpen(false);
                      }
                    }}
                    placeholder="Ketik SKU, nama ban/velg, spesifikasi, atau ukuran ring..."
                    className={`w-full h-10 pl-9 pr-9 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none transition ${
                      errors.product_id
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-100'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                  {productSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Bersihkan pencarian"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((o) => !o)}
                      aria-label="Buka daftar produk"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Panel Dropdown Hasil Pencarian Combobox */}
              {dropdownOpen && !selectedProduct && (
                <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20 divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500 text-center">
                      Tidak ada produk yang cocok dengan &ldquo;{productSearch}&rdquo;
                    </div>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProductId(String(p.id));
                          setProductSearch('');
                          setDropdownOpen(false);
                          setErrors((prev) => ({ ...prev, product_id: undefined }));
                        }}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/70 transition flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              {p.code}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                p.category === 'ban'
                                  ? 'bg-slate-800 text-white border-slate-900'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {p.category === 'ban' ? 'Ban' : 'Velg'}
                            </span>
                            <span className="font-sans tabular-nums text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              {p.ring_size}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900 truncate mt-1">
                            {p.name}
                          </div>
                          {p.specification && (
                            <div className="text-[11px] font-medium text-slate-600 tabular-nums">
                              {p.specification}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                            Stok Sistem
                          </div>
                          <div className="font-sans tabular-nums text-xs font-bold text-slate-900">
                            {p.current_stock} unit
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {errors.product_id && (
                <div className="text-xs text-rose-600 font-medium mt-1">
                  {errors.product_id}
                </div>
              )}
            </div>

            {/* Info Kartu Stok Sistem Saat Ini */}
            {selectedProduct && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800">
                      {selectedProduct.code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                        selectedProduct.category === 'ban'
                          ? 'bg-slate-800 text-white border-slate-900'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {selectedProduct.category === 'ban' ? 'Ban' : 'Velg'}
                    </span>
                    <span className="font-sans tabular-nums text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedProduct.ring_size}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {selectedProduct.name}
                  </div>
                  <div className="text-xs font-medium text-slate-600 tabular-nums mt-0.5">
                    {selectedProduct.specification || '—'}
                  </div>
                </div>

                <div className="text-right shrink-0 px-3 py-2 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Stok Sistem
                  </div>
                  <div className="font-sans tabular-nums text-lg font-bold text-slate-900 flex items-center justify-end gap-1">
                    <PackageCheck className="w-4 h-4 text-blue-600" />
                    <span>{selectedProduct.current_stock}</span>
                    <span className="text-xs font-normal text-slate-500">
                      unit
                    </span>
                  </div>
                </div>
              </div>
            )}
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
                <span>Kirim Pengajuan Opname ke Owner</span>
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

      {toast && (
        <div className="fixed right-5 bottom-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
