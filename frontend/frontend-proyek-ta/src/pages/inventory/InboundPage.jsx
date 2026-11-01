import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, Loader2, Plus, Trash2 } from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createInbound } from '../../api/inventoryApi';
import './Inventory.css';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
let rowSeq = 0;
const newRow = () => ({ key: ++rowSeq, product_id: '', quantity: '', purchase_price: '' });

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
    <div className="iv">
      <h1 className="iv-title"><ArrowDownToLine size={24} /> Penerimaan Barang Masuk</h1>
      <p className="iv-sub">Catat nota restock dari supplier — stok dan harga beli produk diperbarui otomatis.</p>

      <form onSubmit={submit} noValidate>
        {(apiError || loadError) && <div className="iv-banner error">{apiError || loadError}</div>}

        <div className="iv-card">
          <div className="iv-card-h">Data Nota</div>
          <div className="iv-card-b iv-grid">
            <div className="iv-field">
              <label>No. Surat Jalan / Faktur</label>
              <input className="iv-input mono" value={header.receipt_number} onChange={setH('receipt_number')} maxLength={50} placeholder="Otomatis jika kosong" />
            </div>
            <div className="iv-field">
              <label>Nama Supplier <i>*</i></label>
              <input className={`iv-input ${errors.supplier_name ? 'err' : ''}`} value={header.supplier_name} onChange={setH('supplier_name')} maxLength={150} placeholder="PT Gajah Tunggal Perkasa" />
              {errors.supplier_name && <div className="iv-err">{errors.supplier_name}</div>}
            </div>
            <div className="iv-field">
              <label>Tanggal Penerimaan <i>*</i></label>
              <input className={`iv-input ${errors.received_date ? 'err' : ''}`} type="date" value={header.received_date} onChange={setH('received_date')} />
              {errors.received_date && <div className="iv-err">{errors.received_date}</div>}
            </div>
            <div className="iv-field">
              <label>Catatan Nota</label>
              <input className="iv-input" value={header.notes} onChange={setH('notes')} placeholder="Opsional" />
            </div>
          </div>
        </div>

        <div className="iv-card">
          <div className="iv-card-h">
            <span>Daftar Barang Masuk</span>
            <button type="button" className="iv-btn iv-btn-ghost" onClick={() => setRows((rs) => [...rs, newRow()])}>
              <Plus size={15} /> Tambah Baris Barang
            </button>
          </div>
          {errors.rowsGeneral && <div className="iv-banner error" style={{ margin: 12 }}>{errors.rowsGeneral}</div>}
          <div className="iv-wrap">
            <table className="iv-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Produk</th>
                  <th className="r" style={{ width: 110 }}>Kuantitas</th>
                  <th className="r" style={{ width: 170 }}>Harga Beli Satuan</th>
                  <th className="r" style={{ width: 160 }}>Subtotal</th>
                  <th className="c" style={{ width: 56 }}>Hapus</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = productMap.get(r.product_id);
                  return (
                    <tr key={r.key}>
                      <td>
                        <select className={`iv-select ${re(r.key).product_id ? 'err' : ''}`} value={r.product_id} onChange={(e) => pickProduct(r.key, e.target.value)}>
                          <option value="">— Pilih produk —</option>
                          {products.map((x) => (
                            <option key={x.id} value={x.id}>{x.code} — {x.name} ({x.ring_size})</option>
                          ))}
                        </select>
                        {re(r.key).product_id && <div className="iv-err">{re(r.key).product_id}</div>}
                        {p && <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Stok saat ini: <span className="mono">{p.current_stock}</span> unit</div>}
                      </td>
                      <td>
                        <input className={`iv-input r mono ${re(r.key).quantity ? 'err' : ''}`} type="number" min="1" step="1" value={r.quantity} onChange={(e) => updateRow(r.key, { quantity: e.target.value })} />
                        {re(r.key).quantity && <div className="iv-err">{re(r.key).quantity}</div>}
                      </td>
                      <td>
                        <input className={`iv-input r mono ${re(r.key).purchase_price ? 'err' : ''}`} type="number" min="0" step="any" value={r.purchase_price} onChange={(e) => updateRow(r.key, { purchase_price: e.target.value })} />
                        {re(r.key).purchase_price && <div className="iv-err">{re(r.key).purchase_price}</div>}
                      </td>
                      <td className="r mono iv-sub-cell">{rupiah(lineSubtotal(r))}</td>
                      <td className="c">
                        <button type="button" className="iv-icon-btn" title="Hapus baris" aria-label="Hapus baris" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="iv-sticky">
          <div className="iv-stats">
            <div className="iv-stat"><span>Jenis Barang</span><b className="mono">{totalTypes}</b></div>
            <div className="iv-stat"><span>Total Unit</span><b className="mono">{totalUnits}</b></div>
            <div className="iv-stat"><span>Total Nota</span><b className="mono">{rupiah(totalAmount)}</b></div>
          </div>
          <button type="submit" className="iv-btn iv-btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="iv-spin" />}
            {saving ? 'Memproses...' : 'Bukukan Penerimaan Barang'}
          </button>
        </div>
      </form>

      {toast && <div className="iv-toast">{toast}</div>}
    </div>
  );
}

