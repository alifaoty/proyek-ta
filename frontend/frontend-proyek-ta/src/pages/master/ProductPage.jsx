import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Loader2, PackageOpen, Pencil, Plus, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import {
  createProduct, deleteProduct, getProducts, updateProduct,
} from '../../api/productApi';

const RING_SIZES = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20'];
const TABS = [
  { key: 'all', label: 'Semua Produk' },
  { key: 'ban-baru', label: 'Ban Baru', category: 'ban', condition: 'baru' },
  { key: 'ban-bekas', label: 'Ban Bekas', category: 'ban', condition: 'bekas' },
  { key: 'velg-baru', label: 'Velg Baru', category: 'velg', condition: 'baru' },
  { key: 'velg-bekas', label: 'Velg Bekas', category: 'velg', condition: 'bekas' },
];
const EMPTY_FORM = {
  code: '', name: '', category: 'ban', item_condition: 'baru', ring_size: 'R15',
  specification: '', purchase_price: '', selling_price: '', current_stock: '',
};

const rupiah = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
const errMsg = (err, fallback) => err.response?.data?.message || fallback;

function validate(f) {
  const e = {};
  if (!f.code.trim()) e.code = 'Kode wajib diisi';
  if (!f.name.trim()) e.name = 'Nama wajib diisi';
  if (!f.ring_size) e.ring_size = 'Ring wajib diisi';
  const num = (key, label, int) => {
    const v = f[key];
    if (v === '' || v === null) e[key] = `${label} wajib diisi`;
    else if (Number(v) < 0) e[key] = `${label} tidak boleh negatif`;
    else if (int && !Number.isInteger(Number(v))) e[key] = `${label} harus bilangan bulat`;
  };
  num('purchase_price', 'Harga beli');
  num('selling_price', 'Harga jual');
  num('current_stock', 'Stok', true);
  if (!e.purchase_price && !e.selling_price && Number(f.selling_price) < Number(f.purchase_price)) {
    e.selling_price = 'Harga jual tidak boleh lebih rendah dari harga beli';
  }
  return e;
}

function Field({ label, error, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2 text-left' : 'text-left'}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
        {label}
      </label>
      {children}
      {error && <div className="text-xs text-rose-600 font-medium mt-1">{error}</div>}
    </div>
  );
}

const baseInputCls = (hasErr) =>
  `w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none transition ${
    hasErr
      ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
  }`;

function ProductModal({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          code: product.code, name: product.name, category: product.category,
          item_condition: product.item_condition, ring_size: product.ring_size,
          specification: product.specification || '',
          purchase_price: String(product.purchase_price), selling_price: String(product.selling_price),
          current_stock: String(product.current_stock),
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    setApiError('');
    if (Object.keys(v).length) return;
    setSaving(true);
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      specification: form.specification.trim(),
      purchase_price: Number(form.purchase_price),
      selling_price: Number(form.selling_price),
      current_stock: Number(form.current_stock),
    };
    try {
      if (isEdit) await updateProduct(product.id, payload);
      else await createProduct(payload);
      onSaved(isEdit ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
    } catch (err) {
      setApiError(errMsg(err, 'Gagal menyimpan produk'));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form
        className="w-full max-w-xl bg-white border border-slate-200/80 rounded-xl shadow-xl overflow-hidden font-sans"
        onSubmit={submit}
        noValidate
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900">
            {isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
          </h2>
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {apiError && (
            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left">
              {apiError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Field label="Kode Produk" error={errors.code}>
              <input
                className={`${baseInputCls(errors.code)} font-mono uppercase`}
                value={form.code}
                onChange={set('code')}
                maxLength={50}
                placeholder="Masukkan kode produk"
                autoFocus
              />
            </Field>
            <Field label="Nama Produk" error={errors.name}>
              <input
                className={baseInputCls(errors.name)}
                value={form.name}
                onChange={set('name')}
                maxLength={150}
                placeholder="Masukkan nama produk"
              />
            </Field>
            <Field label="Kategori Produk">
              <select className={baseInputCls(false)} value={form.category} onChange={set('category')}>
                <option value="ban">Ban</option>
                <option value="velg">Velg</option>
              </select>
            </Field>
            <Field label="Kondisi Produk">
              <select
                className={baseInputCls(false)}
                value={form.item_condition}
                onChange={set('item_condition')}
              >
                <option value="baru">Baru</option>
                <option value="bekas">Bekas</option>
              </select>
            </Field>
            <Field label="Ukuran Ring" error={errors.ring_size}>
              <select
                className={`${baseInputCls(errors.ring_size)} font-mono`}
                value={form.ring_size}
                onChange={set('ring_size')}
              >
                {RING_SIZES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Spesifikasi Produk">
              <input
                className={baseInputCls(false)}
                value={form.specification}
                onChange={set('specification')}
                maxLength={100}
                placeholder="Masukkan spesifikasi produk"
              />
            </Field>
            <Field label="Harga Perolehan (Rp)" error={errors.purchase_price}>
              <input
                className={`${baseInputCls(errors.purchase_price)} font-mono tabular-nums`}
                type="number"
                min="0"
                step="any"
                value={form.purchase_price}
                onChange={set('purchase_price')}
                placeholder="Contoh: 650000"
              />
            </Field>
            <Field label="Harga Jual (Rp)" error={errors.selling_price}>
              <input
                className={`${baseInputCls(errors.selling_price)} font-mono tabular-nums`}
                type="number"
                min="0"
                step="any"
                value={form.selling_price}
                onChange={set('selling_price')}
                placeholder="Contoh: 850000"
              />
            </Field>
            <Field label={isEdit ? 'Stok Fisik' : 'Stok Awal'} error={errors.current_stock}>
              <input
                className={`${baseInputCls(errors.current_stock)} font-mono tabular-nums`}
                type="number"
                min="0"
                step="1"
                value={form.current_stock}
                onChange={set('current_stock')}
                placeholder="Masukkan jumlah stok"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            className="h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition disabled:opacity-50"
            onClick={onClose}
            disabled={saving}
          >
            Batal
          </button>
          <button
            type="submit"
            className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            disabled={saving}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Produk'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDelete({ product, onClose, onDeleted, onError }) {
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
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-3.5">Kode SKU</th>
                <th className="py-2.5 px-3.5">Nama Barang &amp; Spesifikasi</th>
                <th className="py-2.5 px-3.5">Kategori</th>
                <th className="py-2.5 px-3.5">Kondisi</th>
                <th className="py-2.5 px-3.5">Ring</th>
                <th className="py-2.5 px-3.5 text-right">Harga Beli</th>
                <th className="py-2.5 px-3.5 text-right">Harga Jual</th>
                <th className="py-2.5 px-3.5 text-right">Stok Fisik</th>
                <th className="py-2.5 px-3.5 text-center">Status</th>
                <th className="py-2.5 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
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
                    <td className="py-2.5 px-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {p.category === 'ban' ? 'Ban' : 'Velg'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          p.item_condition === 'baru'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {p.item_condition === 'baru' ? 'Baru' : 'Bekas'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-700">
                      {p.ring_size}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-medium text-slate-600 whitespace-nowrap">
                      {rupiah(p.purchase_price)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {rupiah(p.selling_price)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900">
                      {p.current_stock}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {p.current_stock > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Tersedia
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Habis
                        </span>
                      )}
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
        <ProductModal
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
        <ConfirmDelete
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