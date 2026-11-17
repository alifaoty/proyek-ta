import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { createProduct, updateProduct } from '../../api/productApi';
import { RING_SIZES } from '../../constants/productConstants';
import { EMPTY_PRODUCT_FORM, validateProductForm } from '../../utils/productValidator';

const errMsg = (err, fallback) => err.response?.data?.message || fallback;

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

export default function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          code: product.code,
          name: product.name,
          category: product.category,
          item_condition: product.item_condition,
          ring_size: product.ring_size,
          specification: product.specification || '',
          purchase_price: String(product.purchase_price),
          selling_price: String(product.selling_price),
          current_stock: String(product.current_stock),
        }
      : EMPTY_PRODUCT_FORM
  );
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = validateProductForm(form);
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
