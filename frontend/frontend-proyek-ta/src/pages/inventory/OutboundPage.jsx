import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpFromLine, Loader2, PackageCheck } from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createOutbound } from '../../api/inventoryApi';
import './Inventory.css';

const REASONS = [
  { value: 'retur_rusak', label: 'Retur Rusak / Cacat Pabrik' },
  { value: 'pemakaian_internal', label: 'Pemakaian Internal Bengkel' },
  { value: 'peminjaman', label: 'Peminjaman Rekanan' },
  { value: 'hilang', label: 'Barang Hilang' },
];
const EMPTY = { product_id: '', quantity: '', reason: '', notes: '' };

export default function OutboundPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const loadProducts = () =>
    getProducts()
      .then((res) => setProducts(res.data.data))
      .catch(() => setLoadError('Gagal memuat daftar produk'));

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const product = useMemo(() => products.find((p) => String(p.id) === form.product_id), [products, form.product_id]);
  const qty = Number(form.quantity);
  const overStock = !!product && form.quantity !== '' && qty > product.current_stock;

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!form.product_id) e.product_id = 'Pilih produk';
    if (!(Number.isInteger(qty) && qty > 0)) e.quantity = 'Kuantitas harus bilangan bulat > 0';
    else if (overStock) e.quantity = `Melebihi stok fisik (${product.current_stock} unit)`;
    if (!form.reason) e.reason = 'Pilih alasan mutasi';
    setErrors(e);
    setApiError('');
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await createOutbound({
        product_id: Number(form.product_id),
        quantity: qty,
        reason: form.reason,
        notes: form.notes.trim() || undefined,
      });
      setToast(`${res.data.message} Ref: ${res.data.data.reference_number}, sisa stok: ${res.data.data.stock_after}`);
      setForm(EMPTY);
      loadProducts();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Gagal menyimpan mutasi keluar');
      loadProducts();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="iv">
      <h1 className="iv-title"><ArrowUpFromLine size={24} /> Barang Keluar Non-Penjualan</h1>
      <p className="iv-sub">Catat pengeluaran di luar kasir: retur, pemakaian internal, peminjaman, atau barang hilang.</p>

      <form className="iv-narrow" onSubmit={submit} noValidate>
        {(apiError || loadError) && <div className="iv-banner error">{apiError || loadError}</div>}

        <div className="iv-card">
          <div className="iv-card-h">Form Mutasi Keluar</div>
          <div className="iv-card-b iv-grid">
            <div className="iv-field iv-full">
              <label>Produk <i>*</i></label>
              <select className={`iv-select ${errors.product_id ? 'err' : ''}`} value={form.product_id} onChange={set('product_id')}>
                <option value="">— Pilih produk —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name} ({p.ring_size})</option>
                ))}
              </select>
              {errors.product_id && <div className="iv-err">{errors.product_id}</div>}
              {product && (
                <div className={`iv-stock ${product.current_stock > 0 ? 'ok' : 'empty'}`}>
                  <PackageCheck size={15} />
                  Sisa Stok Fisik: <b className="mono">{product.current_stock}</b> unit
                </div>
              )}
            </div>

            <div className="iv-field iv-full">
              <label>Kuantitas Keluar <i>*</i></label>
              <input className={`iv-input mono ${errors.quantity || overStock ? 'err' : ''}`} type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} style={{ maxWidth: 200 }} />
              {overStock && (
                <div className="iv-banner warn"><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> Jumlah melebihi stok fisik ({product.current_stock} unit).</div>
              )}
              {errors.quantity && !overStock && <div className="iv-err">{errors.quantity}</div>}
            </div>

            <div className="iv-field iv-full">
              <label>Alasan Mutasi <i>*</i></label>
              <div className="iv-reasons" role="radiogroup">
                {REASONS.map((r) => (
                  <button key={r.value} type="button" role="radio" aria-checked={form.reason === r.value}
                    className={`iv-reason ${form.reason === r.value ? 'active' : ''}`}
                    onClick={() => setForm((p) => ({ ...p, reason: r.value }))}>
                    {r.label}
                  </button>
                ))}
              </div>
              {errors.reason && <div className="iv-err">{errors.reason}</div>}
            </div>

            <div className="iv-field iv-full">
              <label>Keterangan / Catatan</label>
              <textarea className="iv-textarea" value={form.notes} onChange={set('notes')} placeholder="Contoh: Dinding ban benjol cacat produksi" />
            </div>
          </div>
        </div>

        <button type="submit" className="iv-btn iv-btn-primary" disabled={saving || overStock}>
          {saving && <Loader2 size={16} className="iv-spin" />}
          {saving ? 'Menyimpan...' : 'Simpan Mutasi Keluar'}
        </button>
      </form>

      {toast && <div className="iv-toast">{toast}</div>}
    </div>
  );
}

