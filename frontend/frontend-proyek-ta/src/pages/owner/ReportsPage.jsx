import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  Calendar,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Loader2,
  PackageCheck,
  Receipt,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  exportReportFile,
  getAuditTrailsReport,
  getFinancialReport,
  getStockMutationsReport,
} from '../../api/reportApi';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import {
  MutationTypeBadge,
  StockChangeValue,
} from '../../components/common/StatusBadges';
import useAuth from '../../hooks/useAuth';
import { formatDateTime, rupiah, today } from '../../utils/formatters';

const REPORT_TABS = [
  { key: 'financial', label: 'Laporan Laba / Rugi' },
  { key: 'stock', label: 'Persediaan & Kartu Mutasi' },
  { key: 'audit', label: 'Log Jejak Audit (Audit Trail)' },
];

const EXPENSE_CATEGORY_LABELS = {
  listrik_air_internet: 'Listrik, Air & Internet',
  perlengkapan_bengkel: 'Perlengkapan Bengkel',
  konsumsi_toko: 'Konsumsi Toko',
  perawatan_alat: 'Perawatan Alat',
  lain_lain: 'Lain-lain',
};

const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

function AuditActionBadge({ action }) {
  const act = String(action || '').toUpperCase();
  let cls = 'bg-slate-100 text-slate-700 border-slate-200';
  if (act.includes('CREATE') || act.includes('INBOUND') || act.includes('APPROVE')) {
    cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (act.includes('DELETE') || act.includes('REJECT')) {
    cls = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (act.includes('UPDATE') || act.includes('OUTBOUND') || act.includes('OPNAME')) {
    cls = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (act.includes('POS') || act.includes('LOGIN')) {
    cls = 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${cls}`}
    >
      {act || '—'}
    </span>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('financial');

  // State input tanggal pada toolbar & state tanggal yang sudah diterapkan (applied)
  const [startInput, setStartInput] = useState(firstDayOfMonth);
  const [endInput, setEndInput] = useState(today);
  const [appliedPeriod, setAppliedPeriod] = useState(() => ({
    start_date: firstDayOfMonth(),
    end_date: today(),
  }));
  const [dateError, setDateError] = useState('');

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [exportingFormat, setExportingFormat] = useState(null); // 'xlsx' | 'pdf' | null
  const [toast, setToast] = useState(null);

  // Data per tab
  const [financialData, setFinancialData] = useState({
    summary: {
      total_revenue: 0,
      total_cogs_hpp: 0,
      gross_profit: 0,
      total_operational_expenses: 0,
      net_estimated_profit: 0,
      total_transactions: 0,
      total_items_sold: 0,
    },
    expense_breakdown: [],
    recent_sales: [],
  });

  const [stockData, setStockData] = useState({
    summary: {
      total_sku: 0,
      total_physical_units: 0,
      total_inventory_value: 0,
      available_sku: 0,
      empty_sku: 0,
    },
    mutations: [],
  });

  const [auditData, setAuditData] = useState({
    total_records: 0,
    logs: [],
  });

  const loadActiveTabReport = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const params = {
        start_date: appliedPeriod.start_date,
        end_date: appliedPeriod.end_date,
      };

      if (activeTab === 'financial') {
        const res = await getFinancialReport(params);
        if (res.data?.data) setFinancialData(res.data.data);
      } else if (activeTab === 'stock') {
        const res = await getStockMutationsReport(params);
        if (res.data?.data) setStockData(res.data.data);
      } else {
        const res = await getAuditTrailsReport(params);
        if (res.data?.data) setAuditData(res.data.data);
      }
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          'Gagal memuat data laporan. Silakan periksa koneksi atau rentang tanggal.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, appliedPeriod]);

  useEffect(() => {
    if (user?.role === 'owner') {
      const t = setTimeout(() => loadActiveTabReport(), 0);
      return () => clearTimeout(t);
    }
  }, [user, loadActiveTabReport]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (user && user.role !== 'owner') {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleApplyFilter = (e) => {
    e.preventDefault();
    if (!startInput || !endInput || startInput > endInput) {
      setDateError('Rentang tanggal filter tidak valid');
      return;
    }
    setDateError('');
    setAppliedPeriod({ start_date: startInput, end_date: endInput });
  };

  const handleResetFilter = () => {
    const defStart = firstDayOfMonth();
    const defEnd = today();
    setStartInput(defStart);
    setEndInput(defEnd);
    setDateError('');
    setAppliedPeriod({ start_date: defStart, end_date: defEnd });
  };

  const handleExport = async (format) => {
    if (!startInput || !endInput || startInput > endInput) {
      setDateError('Rentang tanggal filter tidak valid');
      return;
    }
    setDateError('');
    setExportingFormat(format);
    try {
      const filename = await exportReportFile({
        type: activeTab,
        format,
        start_date: appliedPeriod.start_date,
        end_date: appliedPeriod.end_date,
      });
      setToast({
        type: 'success',
        message: `Berkas ${filename} berhasil diunduh.`,
      });
    } catch {
      setToast({
        type: 'error',
        message: `Gagal mengekspor laporan ke format ${format.toUpperCase()}.`,
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const finSummary = financialData.summary || {};
  const netProfit = Number(finSummary.net_estimated_profit || 0);
  const isProfitable = netProfit >= 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 text-slate-900 space-y-5">
      {/* Header Halaman & Tombol Ekspor */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-left">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Laporan &amp; Audit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluasi laba rugi finansial, rekapitulasi nilai aset persediaan,
            serta log akuntabilitas aktivitas pengguna.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={Boolean(exportingFormat)}
            onClick={() => handleExport('xlsx')}
            className="h-10 px-3.5 rounded-lg border border-emerald-600 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 disabled:opacity-50 text-xs font-semibold inline-flex items-center gap-2 shadow-2xs transition cursor-pointer"
          >
            {exportingFormat === 'xlsx' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            disabled={Boolean(exportingFormat)}
            onClick={() => handleExport('pdf')}
            className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            {exportingFormat === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Cetak PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Baris Filter Rentang Tanggal & Tab Navigasi */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-3.5 space-y-3 text-left">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Segmented Tabs Navigasi Laporan */}
          <SegmentedTabs
            tabs={REPORT_TABS}
            value={activeTab}
            onChange={setActiveTab}
          />

          {/* Form Filter Rentang Tanggal */}
          <form
            onSubmit={handleApplyFilter}
            noValidate
            className="flex flex-wrap items-center gap-2"
          >
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Periode:</span>
            </div>
            <input
              type="date"
              aria-label="Tanggal Mulai"
              value={startInput}
              onChange={(e) => {
                setStartInput(e.target.value);
                if (dateError) setDateError('');
              }}
              className={`h-8 px-2.5 bg-white border rounded-lg text-xs font-sans tabular-nums text-slate-700 outline-none transition ${
                dateError
                  ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            <span className="text-xs text-slate-400">s.d.</span>
            <input
              type="date"
              aria-label="Tanggal Akhir"
              value={endInput}
              onChange={(e) => {
                setEndInput(e.target.value);
                if (dateError) setDateError('');
              }}
              className={`h-8 px-2.5 bg-white border rounded-lg text-xs font-sans tabular-nums text-slate-700 outline-none transition ${
                dateError
                  ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            <button
              type="submit"
              className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Filter className="w-3 h-3" />
              <span>Terapkan Filter</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </form>
        </div>

        {dateError && (
          <div className="text-xs text-red-600 font-medium">
            {dateError}
          </div>
        )}
      </div>

      {apiError && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* KONTEN TAB 1: LAPORAN LABA / RUGI (FINANCIAL) */}
      {activeTab === 'financial' && (
        <div className="space-y-5">
          {/* Grid 4 Kartu KPI Finansial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Omzet Penjualan
                </span>
                <div className="font-sans tabular-nums text-xl font-bold text-slate-900 mt-1">
                  {rupiah(finSummary.total_revenue)}
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {finSummary.total_transactions || 0} transaksi ({finSummary.total_items_sold || 0} unit)
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total HPP (Modal Terjual)
                </span>
                <div className="font-sans tabular-nums text-xl font-bold text-slate-900 mt-1">
                  {rupiah(finSummary.total_cogs_hpp)}
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Akumulasi harga pokok historis
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Biaya Operasional
                </span>
                <div className="font-sans tabular-nums text-xl font-bold text-slate-900 mt-1">
                  {rupiah(finSummary.total_operational_expenses)}
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Beban toko di luar pembelian stok
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <div
              className={`border rounded-xl shadow-sm p-4 flex items-start justify-between gap-3 ${
                isProfitable
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-rose-50/60 border-rose-200'
              }`}
            >
              <div>
                <span
                  className={`block text-[11px] font-semibold uppercase tracking-wider ${
                    isProfitable ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  Estimasi Laba Bersih
                </span>
                <div
                  className={`font-sans tabular-nums text-xl font-bold mt-1 ${
                    isProfitable ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {rupiah(netProfit)}
                </div>
                <span
                  className={`block text-[11px] mt-0.5 font-medium ${
                    isProfitable ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isProfitable ? 'Surplus / Laba' : 'Defisit / Rugi'}
                </span>
              </div>
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                  isProfitable
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
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
          </div>

          {/* Grid Rincian Laba Rugi & Transaksi Penjualan */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
            {/* Tabel Ringkasan Laporan Laba Rugi Terstruktur */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Ikhtisar Perhitungan Laba Rugi
                </h2>
                <span className="text-[11px] font-sans tabular-nums text-slate-500">
                  {appliedPeriod.start_date} s.d. {appliedPeriod.end_date}
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                  <span>Menghitung komponen laba rugi...</span>
                </div>
              ) : (
                <div className="p-5 space-y-3 text-xs font-sans tabular-nums">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="font-medium text-slate-700">
                      Pendapatan Penjualan (Settlement)
                    </span>
                    <span className="font-bold text-slate-900 text-right">
                      {rupiah(finSummary.total_revenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200 text-rose-600">
                    <span className="font-medium">
                      Harga Pokok Penjualan (HPP Historis)
                    </span>
                    <span className="font-semibold text-right">
                      - {rupiah(finSummary.total_cogs_hpp)}
                    </span>
                  </div>

                  {/* Laba Kotor */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-100 font-bold text-slate-900">
                    <span>Laba Kotor (Gross Profit)</span>
                    <span className="text-right">
                      {rupiah(finSummary.gross_profit)}
                    </span>
                  </div>

                  {/* Rincian Biaya Operasional */}
                  <div className="pt-2 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Beban &amp; Biaya Operasional Toko
                    </div>
                    {financialData.expense_breakdown?.length === 0 ? (
                      <div className="text-slate-400 italic py-1">
                        Tidak ada pengeluaran operasional pada periode ini.
                      </div>
                    ) : (
                      financialData.expense_breakdown?.map((eb) => (
                        <div
                          key={eb.category}
                          className="flex items-center justify-between text-slate-600 pl-2"
                        >
                          <span>
                            •{' '}
                            {EXPENSE_CATEGORY_LABELS[eb.category] ||
                              eb.category}
                          </span>
                          <span className="text-right font-medium text-rose-600">
                            - {rupiah(eb.total)}
                          </span>
                        </div>
                      ))
                    )}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 font-semibold text-rose-700">
                      <span>Total Biaya Operasional</span>
                      <span className="text-right">
                        - {rupiah(finSummary.total_operational_expenses)}
                      </span>
                    </div>
                  </div>

                  {/* Estimasi Laba Bersih */}
                  <div
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-bold mt-2 ${
                      isProfitable
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    <span>Estimasi Laba Bersih</span>
                    <span className="text-right">{rupiah(netProfit)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tabel Ringkas Transaksi Penjualan Periode Ini */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Rincian Transaksi Penjualan (Settlement)
                  </h2>
                </div>
                <span className="text-[11px] font-sans tabular-nums text-slate-500">
                  {financialData.recent_sales?.length || 0} faktur
                </span>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-4">No Faktur &amp; Waktu</th>
                      <th className="py-2.5 px-4">Kasir</th>
                      <th className="py-2.5 px-4 text-center">Metode</th>
                      <th className="py-2.5 px-4 text-right">Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 text-xs">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-12 text-center text-slate-400"
                        >
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                          <span>Memuat daftar transaksi...</span>
                        </td>
                      </tr>
                    ) : !financialData.recent_sales?.length ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-12 text-center text-slate-400"
                        >
                          Belum ada transaksi penjualan berstatus settlement
                          pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      financialData.recent_sales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="hover:bg-slate-50/80 transition"
                        >
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900">
                              {sale.invoice_code || sale.invoice_number}
                            </div>
                            <div className="font-sans tabular-nums text-[11px] text-slate-500 mt-0.5">
                              {formatDateTime(
                                sale.transaction_date || sale.created_at
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-700">
                            {sale.cashier_name || 'Kasir'}
                          </td>
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-sans tabular-nums font-bold text-slate-900 whitespace-nowrap">
                            {rupiah(sale.grand_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAB 2: PERSEDIAAN & KARTU MUTASI (STOCK) */}
      {activeTab === 'stock' && (
        <div className="space-y-5">
          {/* Grid 3 Kartu KPI Aset Persediaan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Varian Produk (SKU)
                </span>
                <div className="font-sans tabular-nums text-xl font-bold text-slate-900 mt-1">
                  {stockData.summary?.total_sku || 0}{' '}
                  <span className="text-xs font-semibold text-slate-500">
                    SKU
                  </span>
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {stockData.summary?.available_sku || 0} tersedia •{' '}
                  {stockData.summary?.empty_sku || 0} habis
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Unit Fisik di Toko
                </span>
                <div className="font-sans tabular-nums text-xl font-bold text-slate-900 mt-1">
                  {stockData.summary?.total_physical_units || 0}{' '}
                  <span className="text-xs font-semibold text-slate-500">
                    unit
                  </span>
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Akumulasi stok ban &amp; velg siap jual
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Nilai Aset Persediaan
                </span>
                <div className="font-sans tabular-nums text-xl font-bold text-blue-600 mt-1">
                  {rupiah(stockData.summary?.total_inventory_value)}
                </div>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Valuasi berdasarkan harga perolehan
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Tabel Riwayat Mutasi Persediaan (5 Kolom Padat) */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Kartu Mutasi Persediaan Periode Terfilter
                </h2>
              </div>
              <span className="text-[11px] font-sans tabular-nums text-slate-500">
                {stockData.mutations?.length || 0} log pergerakan
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Waktu &amp; Referensi</th>
                    <th className="py-2.5 px-4">Produk &amp; Ring</th>
                    <th className="py-2.5 px-4 text-center">Jenis Mutasi</th>
                    <th className="py-2.5 px-4 text-right">
                      Perubahan &amp; Stok Akhir
                    </th>
                    <th className="py-2.5 px-4">Keterangan &amp; Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 text-xs">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-slate-400"
                      >
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                        <span>Memuat kartu mutasi persediaan...</span>
                      </td>
                    </tr>
                  ) : !stockData.mutations?.length ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-slate-400"
                      >
                        Tidak ada pergerakan mutasi stok pada rentang tanggal
                        ini.
                      </td>
                    </tr>
                  ) : (
                    stockData.mutations.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">
                            {row.reference_code || '—'}
                          </div>
                          <div className="font-sans tabular-nums text-[11px] text-slate-500 mt-0.5">
                            {formatDateTime(row.created_at)}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {row.product_name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-sans tabular-nums">
                            <span className="font-mono">
                              {row.product_code}
                            </span>{' '}
                            • {row.ring_size}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <MutationTypeBadge type={row.mutation_type} />
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div>
                            <StockChangeValue value={row.quantity_change} />
                          </div>
                          <div className="font-sans tabular-nums text-[11px] text-slate-500 mt-0.5">
                            Sisa:{' '}
                            <b className="text-slate-900">
                              {row.stock_after} unit
                            </b>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 max-w-xs">
                          <div className="text-slate-800 line-clamp-2">
                            {row.notes || (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Oleh:{' '}
                            <span className="font-medium text-slate-700">
                              {row.actor_name || '—'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAB 3: LOG JEJAK AUDIT (AUDIT TRAIL) */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden text-left">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Log Jejak Audit Aktivitas Sistem (Audit Trail)
                </h2>
              </div>
            </div>
            <span className="text-[11px] font-sans tabular-nums text-slate-500">
              {auditData.logs?.length || 0} aktivitas tercatat
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Waktu Kejadian</th>
                  <th className="py-2.5 px-4">Pengguna &amp; Peran</th>
                  <th className="py-2.5 px-4">Aksi &amp; Endpoint API</th>
                  <th className="py-2.5 px-4">Deskripsi Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-xs">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 text-center text-slate-400"
                    >
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                      <span>Memuat log jejak audit...</span>
                    </td>
                  </tr>
                ) : !auditData.logs?.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 text-center text-slate-400"
                    >
                      Belum ada rekaman jejak audit pada periode tanggal ini.
                    </td>
                  </tr>
                ) : (
                  auditData.logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-sans tabular-nums font-semibold text-slate-900">
                          {formatDateTime(log.created_at)}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                          #{log.id}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {log.user_name || 'Sistem'}
                        </div>
                        {log.user_role && (
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              log.user_role === 'owner'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {log.user_role}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div>
                          <AuditActionBadge action={log.action} />
                        </div>
                        {log.endpoint && (
                          <div className="font-mono text-[11px] text-slate-500 mt-1">
                            {log.endpoint}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 max-w-md text-slate-700">
                        <div className="line-clamp-2">
                          {log.description || '—'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed right-5 bottom-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold text-white shadow-lg ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
