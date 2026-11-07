import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { getProducts } from '../../api/productApi';
import { createOpname, getOpnames } from '../../api/stockOpnameApi';

const STATUS_TABS = [
  { key: '', label: 'Semua Status' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

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

function DifferenceBadge({ difference }) {
  const diff = Number(difference || 0);
  if (diff < 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
        {diff} unit (Kurang/Hilang)
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
        +{diff} unit (Lebih)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      0 unit (Sesuai)
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        <span>Approved</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3" />
        <span>Rejected</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Clock className="w-3 h-3" />
      <span>Pending</span>
    </span>
  );
}

export default function StockOpnamePage() {
  const [products, setProducts] = useState([]);
  const [opnames, setOpnames] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [physicalStock, setPhysicalStock] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const loadOpnames = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await getOpnames(params);
      setOpnames(res.data.data || []);
    } catch {
      setApiError('Gagal memuat riwayat stock opname.');
    } finally {
      setLoadingHistory(false);
    }
  }, [statusFilter]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await getProducts();
      setProducts(res.data.data || []);
    } catch {
      setApiError('Gagal memuat katalog produk.');
    }
  }, []);

  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      try {
        const res = await getProducts();
        if (active) setProducts(res.data.data || []);
      } catch {
        if (active) setApiError('Gagal memuat katalog produk.');
      }
    };

    fetchProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchOpnames = async () => {
      setLoadingHistory(true);
      try {
        const params = statusFilter ? { status: statusFilter } : {};
        const res = await getOpnames(params);
        if (active) setOpnames(res.data.data || []);
      } catch {
        if (active) setApiError('Gagal memuat riwayat stock opname.');
      } finally {
        if (active) setLoadingHistory(false);
      }
    };

    fetchOpnames();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Filter daftar produk pada dropdown berdasarkan teks pencarian
  const filteredProducts = useMemo(() => {
    const kw = productSearch.trim().toLowerCase();
    if (!kw) return products;
    return products.filter((p) =>
      `${p.code} ${p.name} ${p.ring_size} ${p.specification || ''}`
        .toLowerCase()
        .includes(kw)
    );
  }, [products, productSearch]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)) || null,
    [products, productId]
  );

  // Kalkulasi selisih real-time (stok fisik - stok sistem)
  const hasPhysicalInput =
    physicalStock !== '' &&
    physicalStock !== null &&
    !Number.isNaN(Number(physicalStock)) &&
    Number(physicalStock) >= 0;

  const realtimeDifference = useMemo(() => {
    if (!selectedProduct || !hasPhysicalInput) return null;
    return Number(physicalStock) - Number(selectedProduct.current_stock);
  }, [selectedProduct, hasPhysicalInput, physicalStock]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!productId) {
      nextErrors.product_id = 'Silakan pilih produk ban atau velg terlebih dahulu.';
    }
    const physNum = Number(physicalStock);
    if (
      physicalStock === '' ||
      !Number.isInteger(physNum) ||
      physNum < 0
    ) {
      nextErrors.physical_stock =
        'Stok fisik wajib berupa angka bulat 0 atau lebih.';
    }

    setErrors(nextErrors);
    setApiError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        product_id: Number(productId),
        physical_stock: physNum,
        notes: notes.trim() || undefined,
      };
      const res = await createOpname(payload);
      setToast(
        `${res.data.message} (${res.data.data?.opname_code || 'Pending'})`
      );
      setProductId('');
      setPhysicalStock('');
      setNotes('');
      setProductSearch('');
      loadOpnames();
      loadProducts();
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          'Gagal mengirim pengajuan stock opname.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-left">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Stok Opname</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catat hasil audit hitung fisik di rak gudang. Selisih stok hanya akan
            mengubah saldo inventori setelah disetujui oleh Owner.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadProducts();
            loadOpnames();
          }}
          className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {apiError && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* BAGIAN ATAS: Form Input Hasil Hitung Fisik */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left"
      >
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Form Input Hasil Hitung Fisik Gudang
          </span>
          <span className="text-[11px] text-slate-400">
            Status Awal: <b className="text-amber-600">PENDING APPROVAL</b>
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Kolom Kiri: Pemilihan Produk dengan Pencarian */}
          <div className="lg:col-span-6 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Cari &amp; Pilih Produk Ban / Velg{' '}
                <span className="text-rose-600">*</span>
              </label>

              {/* Input Filter Teks Produk */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Ketik SKU, nama ban/velg, atau ukuran ring untuk memfilter dropdown..."
                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              {/* Dropdown Pilihan Produk */}
              <select
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setErrors((prev) => ({ ...prev, product_id: undefined }));
                }}
                className={`w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 outline-none transition ${
                  errors.product_id
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-100'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                }`}
              >
                <option value="">
                  — Pilih produk ({filteredProducts.length} item tersedia) —
                </option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} ({p.ring_size}) | Stok Sistem:{' '}
                    {p.current_stock} unit
                  </option>
                ))}
              </select>

              {errors.product_id && (
                <div className="text-xs text-rose-600 font-medium mt-1">
                  {errors.product_id}
                </div>
              )}
            </div>

            {/* Info Kartu Stok Sistem Saat Ini */}
            {selectedProduct && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800">
                      {selectedProduct.code}
                    </span>
                    <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedProduct.ring_size}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {selectedProduct.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {selectedProduct.specification || '—'}
                  </div>
                </div>

                <div className="text-right shrink-0 px-3 py-2 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Stok Sistem
                  </div>
                  <div className="font-mono tabular-nums text-lg font-bold text-slate-900 flex items-center justify-end gap-1">
                    <PackageCheck className="w-4 h-4 text-blue-600" />
                    <span>{selectedProduct.current_stock}</span>
                    <span className="text-xs font-normal text-slate-500">
                      unit
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Kanan: Input Stok Fisik, Indikator Selisih, & Catatan */}
          <div className="lg:col-span-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Input Angka Stok Fisik */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Stok Fisik Aktual di Rak{' '}
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={physicalStock}
                  onChange={(e) => {
                    setPhysicalStock(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      physical_stock: undefined,
                    }));
                  }}
                  placeholder="Contoh: 10"
                  className={`w-full h-10 px-3 bg-white border rounded-lg font-mono tabular-nums text-sm font-bold text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-xs placeholder:text-slate-400 outline-none transition ${
                    errors.physical_stock
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                {errors.physical_stock && (
                  <div className="text-xs text-rose-600 font-medium mt-1">
                    {errors.physical_stock}
                  </div>
                )}
              </div>

              {/* Indikator Selisih Real-Time */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Indikator Selisih Real-Time
                </span>
                <div className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center">
                  {realtimeDifference === null ? (
                    <span className="text-xs text-slate-400">
                      Pilih produk &amp; isi stok fisik
                    </span>
                  ) : (
                    <DifferenceBadge difference={realtimeDifference} />
                  )}
                </div>
              </div>
            </div>

            {/* Textarea Catatan / Keterangan Kondisi Barang */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Catatan / Keterangan Kondisi Barang
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pengecekan rutin rak ban R15 depan, ditemukan selisih fisik..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition resize-y"
              />
            </div>
          </div>
        </div>

        {/* Footer Tombol Submit */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim Pengajuan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Pengajuan Opname ke Owner</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* BAGIAN BAWAH: Tabel Riwayat Opname */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Riwayat Pengajuan Stock Opname
            </h2>
            <p className="text-[11px] text-slate-500">
              Daftar seluruh perhitungan fisik beserta status review dari Owner
            </p>
          </div>

          {/* Filter Tab Status */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                  statusFilter === t.key
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">No Opname</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Produk &amp; Ring</th>
                <th className="py-3 px-4">Petugas</th>
                <th className="py-3 px-4 text-right">Stok Sistem</th>
                <th className="py-3 px-4 text-right">Stok Fisik</th>
                <th className="py-3 px-4 text-center">Selisih Unit</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Catatan Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {loadingHistory ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-slate-400"
                  >
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                    <span>Memuat riwayat stock opname...</span>
                  </td>
                </tr>
              ) : opnames.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-slate-400"
                  >
                    Belum ada data pengajuan stock opname.
                  </td>
                </tr>
              ) : (
                opnames.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {row.opname_code}
                    </td>
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
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {row.checked_by_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-700">
                      {row.system_stock}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {row.physical_stock}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <DifferenceBadge difference={row.difference} />
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {row.approval_notes ? (
                        <div>
                          <div className="text-slate-800 font-medium">
                            {row.approval_notes}
                          </div>
                          {row.approved_by_name && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Oleh: {row.approved_by_name}
                            </div>
                          )}
                        </div>
                      ) : row.notes ? (
                        <span className="text-slate-500 italic">
                          Catatan staf: {row.notes}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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