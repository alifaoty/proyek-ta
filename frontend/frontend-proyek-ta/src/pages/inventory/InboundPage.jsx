import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createInbound } from '../../api/inventoryApi';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
let rowSeq = 0;
const newRow = () => ({ key: ++rowSeq, product_id: '', quantity: '', purchase_price: '' });

const inputCls = (hasErr) =>
  `w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none transition ${
    hasErr
      ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
  }`;

export default function InboundPage() {
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [header, setHeader] = useState({ receipt_number: '', supplier_name: '', received_date: today(), notes: '' });
  const [rows, setRows] = useState(() => [newRow()]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res.data.data))
      .catch(() => setLoadError('Gagal memuat daftar produk'));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const productMap = useMemo(() => new Map(products.map((p) => [String(p.id), p])), [products]);

  const setH = (k) => (e) => setHeader((p) => ({ ...p, [k]: e.target.value }));
  const updateRow = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const pickProduct = (key, id) => {
    const p = productMap.get(id);
    updateRow(key, { product_id: id, purchase_price: p ? String(p.purchase_price) : '' });
  };

  const lineSubtotal = (r) => (Number(r.quantity) || 0) * (Number(r.purchase_price) || 0);
  const totalTypes = rows.filter((r) => r.product_id).length;
  const totalUnits = rows.reduce((s, r) => s + (Number(r.quantity) > 0 ? Number(r.quantity) : 0), 0);
  const totalAmount = rows.reduce((s, r) => s + lineSubtotal(r), 0);

  const validate = () => {
    const e = { rows: {} };
    if (!header.supplier_name.trim()) e.supplier_name = 'Nama supplier wajib diisi';
    if (!header.received_date) e.received_date = 'Tanggal penerimaan wajib diisi';
    rows.forEach((r) => {
      const re = {};
      if (!r.product_id) re.product_id = 'Pilih produk';
      if (!(Number.isInteger(Number(r.quantity)) && Number(r.quantity) > 0)) re.quantity = 'Harus bilangan bulat > 0';
      if (r.purchase_price === '' || Number(r.purchase_price) < 0) re.purchase_price = 'Harga tidak valid';
      if (Object.keys(re).length) e.rows[r.key] = re;
    });
    const ids = rows.map((r) => r.product_id).filter(Boolean);
    if (new Set(ids).size !== ids.length) e.rowsGeneral = 'Produk yang sama dipilih lebih dari satu baris';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setApiError('');
    if (e.supplier_name || e.received_date || e.rowsGeneral || Object.keys(e.rows).length) return;

    setSaving(true);
    try {
      const res = await createInbound({
        receipt_number: header.receipt_number.trim() || undefined,
        supplier_name: header.supplier_name.trim(),
        received_date: header.received_date,
        notes: header.notes.trim() || undefined,
        items: rows.map((r) => ({
          product_id: Number(r.product_id),
          quantity: Number(r.quantity),
          purchase_price: Number(r.purchase_price),
        })),
      });
      setToast(`${res.data.message} (${res.data.data.receipt_number})`);
      setHeader({ receipt_number: '', supplier_name: '', received_date: today(), notes: '' });
      setRows([newRow()]);
      setErrors({});
      // Muat ulang agar harga beli terbaru tampil sebagai default
      getProducts().then((r) => setProducts(r.data.data)).catch(() => {});
    } catch (err) {
      setApiError(err.response?.data?.message || 'Gagal membukukan penerimaan barang');
    } finally {
      setSaving(false);
    }
  };

  const re = (key) => errors.rows?.[key] || {};

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900">
      {/* Header Halaman */}
      <div className="mb-4 text-left">
        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Penerimaan Barang</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Catat nota restock dari supplier — stok dan harga beli produk diperbarui otomatis.
        </p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        {(apiError || loadError) && (
          <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left">
            {apiError || loadError}
          </div>
        )}

        {/* Card Header Faktur */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-left">
            Data Nota
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                No. Surat Jalan / Faktur
              </label>
              <input
                className={`${inputCls(false)} font-mono`}
                value={header.receipt_number}
                onChange={setH('receipt_number')}
                maxLength={50}
                placeholder="Otomatis jika kosong"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Nama Supplier <span className="text-rose-600">*</span>
              </label>
              <input
                className={inputCls(errors.supplier_name)}
                value={header.supplier_name}
                onChange={setH('supplier_name')}
                maxLength={150}
                placeholder="PT Gajah Tunggal Perkasa"
              />
              {errors.supplier_name && (
                <div className="text-xs text-rose-600 font-medium mt-1">{errors.supplier_name}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Tanggal Penerimaan <span className="text-rose-600">*</span>
              </label>
              <input
                className={`${inputCls(errors.received_date)} font-mono`}
                type="date"
                value={header.received_date}
                onChange={setH('received_date')}
              />
              {errors.received_date && (
                <div className="text-xs text-rose-600 font-medium mt-1">{errors.received_date}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Catatan Nota
              </label>
              <input
                className={inputCls(false)}
                value={header.notes}
                onChange={setH('notes')}
                placeholder="Opsional"
              />
            </div>
          </div>
        </div>

        {/* Card Rincian Barang Masuk */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Daftar Barang Masuk
            </span>
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, newRow()])}
              className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Tambah Baris Barang</span>
            </button>
          </div>

          {errors.rowsGeneral && (
            <div className="m-3 px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left">
              {errors.rowsGeneral}
            </div>
          )}

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3.5 w-[42%]">Produk</th>
                  <th className="py-2.5 px-3.5 text-right w-28">Kuantitas</th>
                  <th className="py-2.5 px-3.5 text-right w-44">Harga Beli Satuan</th>
                  <th className="py-2.5 px-3.5 text-right w-40">Subtotal</th>
                  <th className="py-2.5 px-3.5 text-center w-14">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-xs">
                {rows.map((r) => {
                  const p = productMap.get(r.product_id);
                  return (
                    <tr key={r.key} className="align-top hover:bg-slate-50/50">
                      <td className="py-2.5 px-3.5">
                        <select
                          className={inputCls(re(r.key).product_id)}
                          value={r.product_id}
                          onChange={(e) => pickProduct(r.key, e.target.value)}
                        >
                          <option value="">— Pilih produk —</option>
                          {products.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.code} — {x.name} ({x.ring_size})
                            </option>
                          ))}
                        </select>
                        {re(r.key).product_id && (
                          <div className="text-xs text-rose-600 font-medium mt-1">
                            {re(r.key).product_id}
                          </div>
                        )}
                        {p && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>Stok saat ini:</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-mono font-semibold border ${
                                p.current_stock > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {p.current_stock} unit
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <input
                          className={`${inputCls(re(r.key).quantity)} text-right font-mono tabular-nums`}
                          type="number"
                          min="1"
                          step="1"
                          value={r.quantity}
                          onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                        />
                        {re(r.key).quantity && (
                          <div className="text-xs text-rose-600 font-medium mt-1 text-right">
                            {re(r.key).quantity}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <input
                          className={`${inputCls(re(r.key).purchase_price)} text-right font-mono tabular-nums`}
                          type="number"
                          min="0"
                          step="any"
                          value={r.purchase_price}
                          onChange={(e) => updateRow(r.key, { purchase_price: e.target.value })}
                        />
                        {re(r.key).purchase_price && (
                          <div className="text-xs text-rose-600 font-medium mt-1 text-right">
                            {re(r.key).purchase_price}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 pt-5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {rupiah(lineSubtotal(r))}
                      </td>
                      <td className="py-2.5 px-3.5 pt-3.5 text-center">
                        <button
                          type="button"
                          title="Hapus baris"
                          aria-label="Hapus baris"
                          disabled={rows.length === 1}
                          onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sticky Summary Bar */}
        <div className="sticky bottom-3 z-10 bg-white border border-slate-200/90 rounded-xl shadow-md px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-6 text-left">
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Jenis Barang
              </span>
              <b className="font-mono tabular-nums text-base font-bold text-slate-900">
                {totalTypes}
              </b>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Total Unit
              </span>
              <b className="font-mono tabular-nums text-base font-bold text-slate-900">
                {totalUnits}
              </b>
            </div>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Total Nota
              </span>
              <b className="font-mono tabular-nums text-base font-bold text-blue-600">
                {rupiah(totalAmount)}
              </b>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold shadow-xs transition inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Memproses...' : 'Bukukan Penerimaan Barang'}</span>
          </button>
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