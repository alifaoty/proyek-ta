import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, PackageOpen, Pencil, Plus, RefreshCw, Search, Trash2,
} from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { RING_SIZES, PRODUCT_TABS as TABS } from '../../constants/productConstants';
import { rupiah } from '../../utils/formatters';
import ProductDeleteModal from './ProductDeleteModal';
import ProductFormModal from './ProductFormModal';

export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [ring, setRing] = useState('');
  const [stock, setStock] = useState('');
  const [modal, setModal] = useState(null); // { product? }
  const [toDelete, setToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(() => {
    const p = {};
    const t = TABS.find((x) => x.key === tab);
    if (search) p.search = search;
    if (t?.category) { p.category = t.category; p.condition = t.condition; }
    if (ring) p.ring_size = ring;
    if (stock) p.stock_status = stock;
    return p;
  }, [search, tab, ring, stock]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getProducts(params);
      setProducts(res.data.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (type, message) => setToast({ type, message });

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-left">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Master Produk</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola katalog produk, harga, dan ketersediaan stok
          </p>
        </div>
        <button
          type="button"
          className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          onClick={() => setModal({})}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk</span>
        </button>
      </div>

      {/* Control Toolbar Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-3 mb-4 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              className="w-full h-9 pl-9 pr-3 bg-slate-50/70 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
              placeholder="Cari kode produk, nama produk, atau spesifikasi"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Ukuran Ring"
              value={ring}
              onChange={(e) => setRing(e.target.value)}
              className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition flex-1 sm:flex-none"
            >
              <option value="">Semua Ukuran Ring</option>
              {RING_SIZES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              aria-label="Status Stok"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition flex-1 sm:flex-none"
            >
              <option value="">Semua Status Stok</option>
              <option value="available">Stok Tersedia</option>
              <option value="empty">Stok Kosong</option>
            </select>
          </div>
        </div>

        {/* Segmented Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                tab === t.key
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State Banner */}
      {loadError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Gagal memuat katalog produk</span>
          </span>
          <button
            type="button"
            onClick={load}
            className="h-8 px-3 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba lagi</span>
          </button>
        </div>
      )}

      {/* Data Grid Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3.5">Kode SKU</th>
                <th className="py-2.5 px-3.5">Nama Barang &amp; Spesifikasi</th>
                <th className="py-2.5 px-3.5">Tipe &amp; Ring</th>
                <th className="py-2.5 px-3.5 text-right">Harga Beli</th>
                <th className="py-2.5 px-3.5 text-right">Harga Jual</th>
                <th className="py-2.5 px-3.5 text-center">Stok &amp; Status</th>
                <th className="py-2.5 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="py-3 px-3.5">
                        <div className="h-3.5 rounded bg-slate-200/70 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading &&
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {p.code}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      {p.specification && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {p.specification}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.category === 'ban' ? 'Ban' : 'Velg'}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            p.item_condition === 'baru'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {p.item_condition === 'baru' ? 'Baru' : 'Bekas'}
                        </span>
                        <span className="font-mono font-bold text-slate-700 text-[11px] px-1.5 py-0.5 rounded bg-slate-100">
                          {p.ring_size}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-medium text-slate-600 whitespace-nowrap">
                      {rupiah(p.purchase_price)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {rupiah(p.selling_price)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-2">
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {p.current_stock} unit
                        </span>
                        {p.current_stock > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Tersedia
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Habis
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
                          title="Edit"
                          aria-label="Edit"
                          onClick={() => setModal({ product: p })}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus"
                          aria-label="Hapus"
                          onClick={() => setToDelete(p)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && !loadError && products.length === 0 && (
          <div className="py-12 px-4 text-center text-slate-500 text-xs">
            <PackageOpen className="w-9 h-9 text-slate-400 mx-auto mb-2" />
            <div>Belum ada data ban atau velg. Klik Tambah Produk untuk mengisi data.</div>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-200/80 text-[11px] text-slate-500 text-left font-medium">
            Menampilkan <span className="font-mono font-semibold text-slate-700">{products.length}</span> produk
          </div>
        )}
      </div>

      {modal && (
        <ProductFormModal
          product={modal.product}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            setModal(null);
            showToast('success', msg);
            load();
          }}
        />
      )}
      {toDelete && (
        <ProductDeleteModal
          product={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={(msg) => {
            setToDelete(null);
            showToast('success', msg);
            load();
          }}
          onError={(msg) => {
            setToDelete(null);
            showToast('error', msg);
          }}
        />
      )}
      {toast && (
        <div
          className={`fixed right-5 bottom-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold text-white shadow-lg ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
