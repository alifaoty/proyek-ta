import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { getOwnerSummary } from '../../api/dashboardApi';
import { DifferenceBadge } from '../../components/common/StatusBadges';
import ToastNotification from '../../components/common/ToastNotification';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import {
  formatDateTime,
  formatReadableDate,
  rupiah,
  today,
} from '../../utils/formatters';
import OpnameReviewModal from './OpnameReviewModal';

const currentMonthYearLabel = () => {
  const d = new Date();
  return d.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
};

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [summaryData, setSummaryData] = useState({
    kpis: {
      today_revenue: 0,
      monthly_revenue: 0,
      monthly_gross_profit: 0,
      monthly_expenses: 0,
      monthly_net_profit: 0,
      monthly_units_sold: 0,
      pending_opname_count: 0,
    },
    pending_opnames: [],
    out_of_stock_products: [],
  });

  // State modal konfirmasi: { mode: 'approve' | 'reject', item: Object } | null
  const [reviewTarget, setReviewTarget] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await getOwnerSummary();
      if (res.data?.data) {
        setSummaryData(res.data.data);
      }
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          'Gagal memuat ringkasan dashboard eksekutif Owner.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'owner') {
      const t = setTimeout(() => loadSummary(), 0);
      return () => clearTimeout(t);
    }
  }, [user, loadSummary]);

  if (user && user.role !== 'owner') {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleReviewSuccess = (message) => {
    setReviewTarget(null);
    showToast(message, 'success');
    loadSummary();
  };

  const kpis = summaryData.kpis || {};
  const pendingOpnames = summaryData.pending_opnames || [];
  const outOfStockProducts = summaryData.out_of_stock_products || [];
  const pendingCount = Number(kpis.pending_opname_count ?? pendingOpnames.length);
  const netProfit = Number(kpis.monthly_net_profit || 0);
  const isProfitable = netProfit >= 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900 space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-left">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-sans tabular-nums">
            Ringkasan performa operasional periode{' '}
            <b className="text-slate-700">{currentMonthYearLabel()}</b> • Hari
            ini: <b className="text-slate-700">{formatReadableDate(today())}</b>
          </p>
        </div>

        <button
          type="button"
          onClick={loadSummary}
          disabled={loading}
          className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          <span>Muat Ulang</span>
        </button>
      </div>

      {apiError && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* BLOK 1: KARTU METRIK KPI (GRID 3 KOLOM) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {/* Kartu 1: Omzet Penjualan */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Omzet Penjualan (Bulan Ini)
            </span>
            <div className="font-sans tabular-nums text-xl font-bold text-slate-900 mt-1">
              {rupiah(kpis.monthly_revenue)}
            </div>
            <span className="block text-[11px] font-sans tabular-nums text-slate-500 mt-1">
              Hari ini:{' '}
              <b className="text-slate-800">{rupiah(kpis.today_revenue)}</b>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        {/* Kartu 2: Estimasi Laba Bersih */}
        <div
          className={`border rounded-xl shadow-sm p-4 flex items-start justify-between gap-3 ${
            isProfitable
              ? 'bg-white border-slate-200/80'
              : 'bg-rose-50/50 border-rose-200'
          }`}
        >
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Estimasi Laba Bersih (Bulan Ini)
            </span>
            <div
              className={`font-sans tabular-nums text-xl font-bold mt-1 ${
                isProfitable ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {rupiah(netProfit)}
            </div>
            <span className="block text-[11px] font-sans tabular-nums text-slate-500 mt-1">
              Laba kotor:{' '}
              <b className="text-slate-800">
                {rupiah(kpis.monthly_gross_profit)}
              </b>
            </span>
          </div>
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
              isProfitable
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-rose-100 border-rose-200 text-rose-700'
            }`}
          >
            {isProfitable ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Kartu 3: Opname Menunggu Approval */}
        <div
          className={`border rounded-xl shadow-sm p-4 flex items-start justify-between gap-3 ${
            pendingCount > 0
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div>
            <span
              className={`block text-[11px] font-semibold uppercase tracking-wider ${
                pendingCount > 0 ? 'text-amber-800' : 'text-slate-500'
              }`}
            >
              Opname Menunggu Persetujuan
            </span>
            <div
              className={`font-sans tabular-nums text-xl font-bold mt-1 ${
                pendingCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {pendingCount}{' '}
              <span className="text-xs font-semibold">
                {pendingCount > 0 ? 'tiket menunggu' : 'terverifikasi'}
              </span>
            </div>
            <Link
              to="/owner/stock-approvals"
              className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline ${
                pendingCount > 0 ? 'text-amber-800' : 'text-blue-600'
              }`}
            >
              <span>Buka Halaman Persetujuan</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
              pendingCount > 0
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BLOK 2 & BLOK 3: ANTREAN OPNAME & PERINGATAN STOK HABIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start text-left">
        {/* BLOK 2 (7 Kolom): Antrean Persetujuan Stok Opname (Action Required Feed) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Antrean Persetujuan Stok Opname
                </h2>
              </div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans tabular-nums font-bold border ${
                pendingOpnames.length > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {pendingOpnames.length} Menunggu
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
              <span>Memuat antrean stok opname...</span>
            </div>
          ) : pendingOpnames.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-emerald-800">
                Seluruh stok fisik telah terverifikasi. Tidak ada pengajuan
                opname tertunda.
              </p>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3.5">No Dokumen &amp; Petugas</th>
                    <th className="py-2.5 px-3.5">Produk &amp; Ring</th>
                    <th className="py-2.5 px-3.5 text-center">
                      Sistem vs Fisik
                    </th>
                    <th className="py-2.5 px-3.5 text-center">Selisih</th>
                    <th className="py-2.5 px-3.5 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 text-xs">
                  {pendingOpnames.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="font-mono font-bold text-slate-900">
                          {row.opname_code}
                        </div>
                        <div className="text-[11px] text-slate-500 font-sans tabular-nums mt-0.5">
                          {formatDateTime(row.created_at)} •{' '}
                          <span className="font-medium text-slate-700">
                            {row.creator_name || row.checked_by_name || 'Admin'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-slate-900">
                          {row.product_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-sans tabular-nums mt-0.5">
                          <span className="font-mono">{row.product_code}</span>{' '}
                          • {row.ring_size}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-sans tabular-nums">
                        <span className="text-slate-600 font-medium">
                          {row.system_stock}
                        </span>
                        <span className="mx-1 text-slate-400">&rarr;</span>
                        <b className="text-slate-900">{row.physical_stock}</b>
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <DifferenceBadge
                          difference={row.difference}
                          minusLabel="Kurang"
                        />
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setReviewTarget({ mode: 'approve', item: row })
                            }
                            className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Setujui</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setReviewTarget({ mode: 'reject', item: row })
                            }
                            className="h-7 px-2.5 rounded-md border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* BLOK 3 (5 Kolom): Peringatan Stok Habis (Early Warning — current_stock === 0) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-4 h-4 ${
                  outOfStockProducts.length > 0
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              />
              <h2 className="text-sm font-bold text-slate-900">
                Peringatan Stok Habis (0 Unit)
              </h2>
            </div>
            <Link
              to="/inventory/inbound"
              className="h-7 px-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-2xs transition"
            >
              <ArrowDownToLine className="w-3 h-3" />
              <span>Restock Barang</span>
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
              <span>Memeriksa ketersediaan stok SKU...</span>
            </div>
          ) : outOfStockProducts.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                <PackageCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-emerald-800">
                Seluruh SKU produk memiliki stok fisik yang tersedia untuk
                dijual.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/70 max-h-[380px] overflow-y-auto">
              {outOfStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="px-4 py-3 hover:bg-slate-50/80 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                        {prod.code}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          prod.category === 'ban'
                            ? 'bg-slate-800 text-white border-slate-900'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {prod.category === 'ban' ? 'Ban' : 'Velg'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          prod.item_condition === 'baru'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {prod.item_condition === 'baru' ? 'Baru' : 'Bekas'}
                      </span>
                      <span className="font-sans tabular-nums text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        {prod.ring_size}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 mt-1 truncate">
                      {prod.name}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Habis (0)
                    </span>
                    <Link
                      to="/inventory/inbound"
                      className="h-7 px-2.5 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold inline-flex items-center gap-1 transition"
                    >
                      <span>Restock Barang</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Konfirmasi Setujui / Tolak Stok Opname */}
      {reviewTarget && (
        <OpnameReviewModal
          mode={reviewTarget.mode}
          item={reviewTarget.item}
          onClose={() => setReviewTarget(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      <ToastNotification toast={toast} />
    </div>
  );
}
