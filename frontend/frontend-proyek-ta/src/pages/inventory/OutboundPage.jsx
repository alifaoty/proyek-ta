import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  History,
  Loader2,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createOutbound, getMutations } from '../../api/inventoryApi';

const REASONS = [
  { value: 'retur_rusak', label: 'Retur Rusak / Cacat Pabrik' },
  { value: 'pemakaian_internal', label: 'Pemakaian Internal Bengkel' },
  { value: 'peminjaman', label: 'Peminjaman Rekanan' },
  { value: 'hilang', label: 'Barang Hilang' },
];

const MUTATION_FILTER_TABS = [
  { key: '', label: 'Semua Mutasi' },
  { key: 'masuk', label: 'Masuk' },
  { key: 'penjualan', label: 'Penjualan' },
  { key: 'keluar_non_penjualan', label: 'Keluar Non-Penjualan' },
  { key: 'penyesuaian', label: 'Penyesuaian / Opname' },
];

const EMPTY = { product_id: '', quantity: '', reason: '', notes: '' };

const inputCls = (hasErr) =>
  `w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none transition ${
    hasErr
      ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
  }`;

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function MutationTypeBadge({ type }) {
  if (type === 'masuk') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Masuk
      </span>
    );
  }
  if (type === 'penjualan') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        Penjualan
      </span>
    );
  }
  if (type === 'keluar_non_penjualan') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        Keluar Non-Penjualan
      </span>
    );
  }
  if (type === 'penyesuaian') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        Penyesuaian / Opname
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      {type || '—'}
    </span>
  );
}

function StockChangeValue({ value }) {
  const num = Number(value || 0);
  if (num > 0) {
    return (
      <span className="font-mono tabular-nums font-bold text-emerald-600">
        +{num}
      </span>
    );
  }
  if (num < 0) {
    return (
      <span className="font-mono tabular-nums font-bold text-rose-600">
        {num}
      </span>
    );
  }
  return (
    <span className="font-mono tabular-nums font-semibold text-slate-500">
      0
    </span>
  );
}

export default function OutboundPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // State Tabel Riwayat Log Mutasi Persediaan
  const [mutations, setMutations] = useState([]);
  const [loadingMutations, setLoadingMutations] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const loadProducts = useCallback(() => {
    getProducts()
      .then((res) => setProducts(res.data.data || []))
      .catch(() => setLoadError('Gagal memuat daftar produk'));
  }, []);

  const loadMutations = useCallback(async () => {
    await Promise.resolve();
    try {
      const params = {};
      if (typeFilter) params.mutation_type = typeFilter;
      if (productFilter) params.product_id = productFilter;
      const res = await getMutations(params);
      setMutations(res.data.data || []);
    } catch {
      setLoadError('Gagal memuat riwayat kartu stok mutasi persediaan');
    } finally {
      setLoadingMutations(false);
    }
  }, [typeFilter, productFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMutations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadMutations]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const product = useMemo(
    () => products.find((p) => String(p.id) === form.product_id),
    [products, form.product_id]
  );
  const qty = Number(form.quantity);
  const overStock =
    !!product && form.quantity !== '' && qty > product.current_stock;

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!form.product_id) e.product_id = 'Pilih produk';
    if (!(Number.isInteger(qty) && qty > 0))
      e.quantity = 'Kuantitas harus bilangan bulat > 0';
    else if (overStock)
      e.quantity = `Melebihi stok fisik (${product.current_stock} unit)`;
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
      setToast(
        `${res.data.message} Ref: ${res.data.data.reference_number}, sisa stok: ${res.data.data.stock_after}`
      );
      setForm(EMPTY);
      loadProducts();
      setLoadingMutations(true);
      loadMutations();
    } catch (err) {
      setApiError(
        err.response?.data?.message || 'Gagal menyimpan mutasi keluar'
      );
      loadProducts();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-left">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Mutasi Persediaan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catat pengeluaran barang di luar kasir serta pantau seluruh riwayat
            mutasi stok (masuk, penjualan, keluar non-penjualan, dan opname).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadProducts();
            setLoadingMutations(true);
            loadMutations();
          }}
          className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* BAGIAN ATAS: Form Mutasi Keluar Non-Penjualan */}
      <form
        className="max-w-3xl space-y-4 text-left"
        onSubmit={submit}
        noValidate
      >
        {(apiError || loadError) && (
          <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {apiError || loadError}
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Form Mutasi Keluar (Non-Penjualan)
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
                    {p.code} — {p.name} ({p.ring_size}) | Stok: {p.current_stock}{' '}
                    unit
                  </option>
                ))}
              </select>
              {errors.product_id && (
                <div className="text-xs text-rose-600 font-medium mt-1">
                  {errors.product_id}
                </div>
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
                    <b className="font-mono tabular-nums font-bold">
                      {product.current_stock}
                    </b>{' '}
                    unit
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
                className={`${inputCls(
                  errors.quantity || overStock
                )} max-w-[200px] font-mono tabular-nums`}
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
                <div className="text-xs text-rose-600 font-medium mt-1">
                  {errors.quantity}
                </div>
              )}
            </div>

            {/* Alasan Mutasi */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Alasan Mutasi <span className="text-rose-600">*</span>
              </label>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                role="radiogroup"
              >
                {REASONS.map((r) => {
                  const active = form.reason === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        setForm((p) => ({ ...p, reason: r.value }))
                      }
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
                <div className="text-xs text-rose-600 font-medium mt-1">
                  {errors.reason}
                </div>
              )}
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Keterangan / Catatan
              </label>
              <textarea
                rows={2}
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

      {/* BAGIAN BAWAH: Tabel Riwayat Log Mutasi Persediaan */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Riwayat Log Mutasi Persediaan
              </h2>
              <p className="text-[11px] text-slate-500">
                Kartu stok seluruh pergerakan masuk, penjualan POS, keluar
                non-penjualan, dan penyesuaian opname
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Produk */}
            <select
              value={productFilter}
              onChange={(e) => {
                setLoadingMutations(true);
                setProductFilter(e.target.value);
              }}
              className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="">Semua Produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>

            {/* Filter Tab Jenis Mutasi */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
              {MUTATION_FILTER_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setLoadingMutations(true);
                    setTypeFilter(t.key);
                  }}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    typeFilter === t.key
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Tanggal &amp; Waktu</th>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4 text-center">Jenis Mutasi</th>
                <th className="py-3 px-4">Referensi</th>
                <th className="py-3 px-4 text-right">Perubahan Stok</th>
                <th className="py-3 px-4 text-right">Sisa Stok Akhir</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Petugas / User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {loadingMutations ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                    <span>Memuat riwayat kartu stok...</span>
                  </td>
                </tr>
              ) : mutations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Belum ada riwayat log mutasi persediaan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                mutations.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {row.product_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {row.product_code} • {row.ring_size}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <MutationTypeBadge type={row.mutation_type} />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {row.reference_code || '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <StockChangeValue value={row.quantity_change} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      {row.stock_after}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-700">
                      {row.notes || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {row.actor_name || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="fixed right-5 bottom-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}