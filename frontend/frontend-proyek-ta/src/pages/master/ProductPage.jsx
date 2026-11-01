import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Boxes, Loader2, PackageOpen, Pencil, Plus, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import {
  createProduct, deleteProduct, getProducts, updateProduct,
} from '../../api/productApi';
import './ProductPage.css';

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
    <div className={`pp-field ${full ? 'pp-full' : ''}`}>
      <label>{label}</label>
      {children}
      {error && <div className="pp-err">{error}</div>}
    </div>
  );
}

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
  const cls = (k) => `pp-input ${errors[k] ? 'err' : ''}`;

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
    <div className="pp-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="pp-modal" onSubmit={submit} noValidate>
        <div className="pp-modal-h">
          <h2>{isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
          <button type="button" className="pp-icon-btn" onClick={onClose} disabled={saving} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="pp-modal-b">
          {apiError && <div className="pp-banner"><span>{apiError}</span></div>}
          <div className="pp-grid">
            <Field label="Kode Produk" error={errors.code}>
              <input className={`${cls('code')} mono`} value={form.code} onChange={set('code')} maxLength={50} placeholder="Masukkan kode produk" autoFocus />
            </Field>
            <Field label="Nama Produk" error={errors.name}>
              <input className={cls('name')} value={form.name} onChange={set('name')} maxLength={150} placeholder="Masukkan nama produk" />
            </Field>
            <Field label="Kategori Produk">
              <select className="pp-select" value={form.category} onChange={set('category')}>
                <option value="ban">Ban</option><option value="velg">Velg</option>
              </select>
            </Field>
            <Field label="Kondisi Produk">
              <select className="pp-select" value={form.item_condition} onChange={set('item_condition')}>
                <option value="baru">Baru</option><option value="bekas">Bekas</option>
              </select>
            </Field>
            <Field label="Ukuran Ring" error={errors.ring_size}>
              <select className="pp-select" value={form.ring_size} onChange={set('ring_size')}>
                {RING_SIZES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Spesifikasi Produk">
              <input className="pp-input" value={form.specification} onChange={set('specification')} maxLength={100} placeholder="Masukkan spesifikasi produk" />
            </Field>
            <Field label="Harga Perolehan (Rp)" error={errors.purchase_price}>
              <input className={`${cls('purchase_price')} mono`} type="number" min="0" step="any" value={form.purchase_price} onChange={set('purchase_price')} placeholder="Contoh: 650000" />
            </Field>
            <Field label="Harga Jual (Rp)" error={errors.selling_price}>
              <input className={`${cls('selling_price')} mono`} type="number" min="0" step="any" value={form.selling_price} onChange={set('selling_price')} placeholder="Contoh: 850000" />
            </Field>
            <Field label={isEdit ? 'Stok Fisik' : 'Stok Awal'} error={errors.current_stock}>
              <input className={`${cls('current_stock')} mono`} type="number" min="0" step="1" value={form.current_stock} onChange={set('current_stock')} placeholder="Masukkan jumlah stok" />
            </Field>
          </div>
        </div>
        <div className="pp-modal-f">
          <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose} disabled={saving}>Batal</button>
          <button type="submit" className="pp-btn pp-btn-primary" disabled={saving}>
            {saving && <Loader2 size={15} className="pp-spin" />}
            {saving ? 'Menyimpan...' : 'Simpan Produk'}
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
    <div className="pp-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="pp-modal sm">
        <div className="pp-modal-h"><h2>Hapus Produk</h2></div>
        <div className="pp-modal-b" style={{ fontSize: 14 }}>
          Hapus <b className="mono">{product.code}</b> — {product.name}? Tindakan ini tidak dapat dibatalkan.
        </div>
        <div className="pp-modal-f">
          <button className="pp-btn pp-btn-ghost" onClick={onClose} disabled={busy}>Batal</button>
          <button className="pp-btn pp-btn-danger" onClick={run} disabled={busy}>
            {busy && <Loader2 size={15} className="pp-spin" />}Hapus
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
    <div className="pp">
      <div className="pp-head">
        <div>
          <h1 className="pp-title"><Boxes size={24} />Master Produk</h1>
          <p className="pp-sub">Kelola katalog produk, harga, dan ketersediaan stok</p>
        </div>
      </div>

      <div className="pp-toolbar">
        <div className="pp-row">
          <div className="pp-search">
            <Search size={16} />
            <input className="pp-input" placeholder="Cari kode produk, nama produk, atau spesifikasi" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <button type="button" className="pp-btn pp-btn-primary" onClick={() => setModal({})}><Plus size={16} /> Tambah Produk</button>
        </div>
        <div className="pp-row">
          <div className="pp-tabs">
            {TABS.map((t) => (
              <button key={t.key} type="button" className={`pp-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
          <div className="pp-filters">
            <select className="pp-select" aria-label="Ukuran Ring" value={ring} onChange={(e) => setRing(e.target.value)}>
              <option value="">Semua Ukuran Ring</option>
              {RING_SIZES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="pp-select" aria-label="Status Stok" value={stock} onChange={(e) => setStock(e.target.value)}>
              <option value="">Semua Status Stok</option>
              <option value="available">Stok Tersedia</option>
              <option value="empty">Stok Kosong</option>
            </select>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="pp-banner">
          <span><AlertTriangle size={14} style={{ verticalAlign: -2 }} /> Gagal memuat katalog produk</span>
          <button className="pp-btn pp-btn-ghost" onClick={load}><RefreshCw size={14} /> Coba lagi</button>
        </div>
      )}

      <div className="pp-card pp-tablecard">
        <div className="pp-table-wrap">
          <table className="pp-table">
            <thead>
              <tr>
                <th>Kode SKU</th><th>Nama Barang &amp; Spesifikasi</th><th>Kategori</th><th>Kondisi</th>
                <th>Ring</th><th className="r">Harga Beli</th><th className="r">Harga Jual</th>
                <th className="r">Stok Fisik</th><th className="c">Status</th><th className="c">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 10 }).map((__, j) => <td key={j}><div className="pp-skel" /></td>)}</tr>
              ))}
              {!loading && products.map((p) => (
                <tr key={p.id}>
                  <td className="mono"><b>{p.code}</b></td>
                  <td>
                    <div className="pp-name">{p.name}</div>
                    {p.specification && <div className="pp-spec">{p.specification}</div>}
                  </td>
                  <td><span className="pp-badge pp-neutral">{p.category === 'ban' ? 'Ban' : 'Velg'}</span></td>
                  <td><span className={`pp-badge ${p.item_condition === 'baru' ? 'pp-neutral' : 'pp-amber'}`}>{p.item_condition === 'baru' ? 'Baru' : 'Bekas'}</span></td>
                  <td className="mono">{p.ring_size}</td>
                  <td className="mono r num">{rupiah(p.purchase_price)}</td>
                  <td className="mono r num">{rupiah(p.selling_price)}</td>
                  <td className="mono r num">{p.current_stock}</td>
                  <td className="c">
                    {p.current_stock > 0
                      ? <span className="pp-pill pp-pill-ok">Tersedia</span>
                      : <span className="pp-pill pp-pill-no">Habis</span>}
                  </td>
                  <td className="c" style={{ whiteSpace: 'nowrap' }}>
                    <button className="pp-icon-btn" title="Edit" aria-label="Edit" onClick={() => setModal({ product: p })}><Pencil size={15} /></button>
                    <button className="pp-icon-btn del" title="Hapus" aria-label="Hapus" onClick={() => setToDelete(p)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !loadError && products.length === 0 && (
          <div className="pp-state">
            <PackageOpen size={40} />
            <div>Belum ada data ban atau velg. Klik Tambah Produk untuk mengisi data.</div>
          </div>
        )}
        {!loading && products.length > 0 && <div className="pp-foot">{products.length} produk ditampilkan</div>}
      </div>

      {modal && (
        <ProductModal
          product={modal.product}
          onClose={() => setModal(null)}
          onSaved={(msg) => { setModal(null); showToast('success', msg); load(); }}
        />
      )}
      {toDelete && (
        <ConfirmDelete
          product={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={(msg) => { setToDelete(null); showToast('success', msg); load(); }}
          onError={(msg) => { setToDelete(null); showToast('error', msg); }}
        />
      )}
      {toast && <div className={`pp-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

