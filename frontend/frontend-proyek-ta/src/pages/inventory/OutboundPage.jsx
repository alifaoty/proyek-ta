import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, PackageCheck } from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createOutbound } from '../../api/inventoryApi';

const REASONS = [
  { value: 'retur_rusak', label: 'Retur Rusak / Cacat Pabrik' },
  { value: 'pemakaian_internal', label: 'Pemakaian Internal Bengkel' },
  { value: 'peminjaman', label: 'Peminjaman Rekanan' },
  { value: 'hilang', label: 'Barang Hilang' },
];
const EMPTY = { product_id: '', quantity: '', reason: '', notes: '' };

const inputCls = (hasErr) =>
  `w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none transition ${
    hasErr
      ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
  }`;

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
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900">
      {/* Header Halaman */}
      <div className="mb-4 text-left">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Mutasi Persediaan</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Catat pengeluaran di luar kasir: retur, pemakaian internal, peminjaman, atau barang hilang.
        </p>
      </div>

      <form className="max-w-2xl space-y-4 text-left" onSubmit={submit} noValidate>
        {(apiError || loadError) && (
          <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {apiError || loadError}
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Form Mutasi Keluar
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Pilih Produk */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Produk <span className="text-rose-600">*</span>
              </label>
              <select
                className={inputCls(errors.product_id)}
                value={form.product_id}
                onChange={set('product_id')}
              >
                <option value="">— Pilih produk —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} ({p.ring_size})
                  </option>
                ))}
              </select>
              {errors.product_id && (
                <div className="text-xs text-rose-600 font-medium mt-1">{errors.product_id}</div>
              )}
              {product && (
                <div
                  className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    product.current_stock > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <PackageCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Sisa Stok Fisik:{' '}
                    <b className="font-mono tabular-nums font-bold">{product.current_stock}</b> unit
                  </span>
                </div>
              )}
            </div>

            {/* Kuantitas Keluar */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Kuantitas Keluar <span className="text-rose-600">*</span>
              </label>
              <input
                className={`${inputCls(errors.quantity || overStock)} max-w-[200px] font-mono tabular-nums`}
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={set('quantity')}
                placeholder="1"
              />
              {overStock && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Jumlah melebihi stok fisik (
                    <b className="font-mono">{product.current_stock}</b> unit).
                  </span>
                </div>
              )}
              {errors.quantity && !overStock && (
                <div className="text-xs text-rose-600 font-medium mt-1">{errors.quantity}</div>
              )}
            </div>

            {/* Alasan Mutasi */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Alasan Mutasi <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup">
                {REASONS.map((r) => {
                  const active = form.reason === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setForm((p) => ({ ...p, reason: r.value }))}
                      className={`h-10 px-3 rounded-lg border text-xs font-semibold text-left transition cursor-pointer ${
                        active
                          ? 'border-blue-600 bg-blue-50/80 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
              {errors.reason && (
                <div className="text-xs text-rose-600 font-medium mt-1">{errors.reason}</div>
              )}
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Keterangan / Catatan
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition resize-y"
                value={form.notes}
                onChange={set('notes')}
                placeholder="Contoh: Dinding ban benjol cacat produksi"
              />
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving || overStock}
              className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Mutasi Keluar'}</span>
            </button>
          </div>
        </div>
      </form>

      {toast && (
        <div className="fixed right-5 bottom-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}