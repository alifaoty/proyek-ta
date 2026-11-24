import { useState } from 'react';
import { Loader2, Lock, X } from 'lucide-react';
import { createProduct, updateProduct } from '../../api/productApi';
import { RING_SIZES } from '../../constants/productConstants';
import { formatThousandDigits, inputCls as baseInputCls, parseDigits } from '../../utils/formatters';
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
          purchase_price: String(Math.round(Number(product.purchase_price || 0))),
          selling_price: String(Math.round(Number(product.selling_price || 0))),
          current_stock: String(product.current_stock ?? 0),
        }
      : EMPTY_PRODUCT_FORM
  );
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setCurrency = (key) => (e) =>
    setForm((p) => ({ ...p, [key]: parseDigits(e.target.value) }));

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
      onSaved(isEdit ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.');
    } catch (err) {
      setApiError(errMsg(err, 'Gagal menyimpan produk.'));
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
                className={`${baseInputCls(errors.ring_size)} font-sans tabular-nums`}
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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  Rp
                </span>
                <input
                  className={`${baseInputCls(errors.purchase_price)} pl-9 font-sans tabular-nums placeholder:text-slate-400`}
                  type="text"
                  inputMode="numeric"
                  value={formatThousandDigits(form.purchase_price)}
                  onChange={setCurrency('purchase_price')}
                  placeholder="0"
                />
              </div>
            </Field>
            <Field label="Harga Jual (Rp)" error={errors.selling_price}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  Rp
                </span>
                <input
                  className={`${baseInputCls(errors.selling_price)} pl-9 font-sans tabular-nums placeholder:text-slate-400`}
                  type="text"
                  inputMode="numeric"
                  value={formatThousandDigits(form.selling_price)}
                  onChange={setCurrency('selling_price')}
                  placeholder="0"
                />
              </div>
            </Field>
            <Field
              label={isEdit ? 'Stok Fisik (Terkunci)' : 'Stok Awal'}
              error={errors.current_stock}
              full={isEdit}
            >
              <div className="relative">
                <input
                  className={`${baseInputCls(errors.current_stock)} font-sans tabular-nums ${
                    isEdit
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed pr-9'
                      : ''
                  }`}
                  type="number"
                  min="0"
                  step="1"
                  value={form.current_stock}
                  onChange={isEdit ? undefined : set('current_stock')}
                  disabled={isEdit}
                  readOnly={isEdit}
                  placeholder="Masukkan jumlah stok"
                />
                {isEdit && (
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
              {isEdit && (
                <div className="text-[11px] text-slate-500 mt-1">
                  Perubahan stok hanya dapat dilakukan melalui menu Penerimaan Barang, Mutasi Keluar, atau Stok Opname.
                </div>
              )}
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
