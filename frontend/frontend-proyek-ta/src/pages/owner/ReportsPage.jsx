import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import {
  exportReportFile,
  getAuditTrailsReport,
  getFinancialReport,
  getStockMutationsReport,
} from '../../api/reportApi';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import ToastNotification from '../../components/common/ToastNotification';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { firstDayOfMonth, today } from '../../utils/formatters';
import AuditTrailReportTab from './reports/AuditTrailReportTab';
import FinancialReportTab from './reports/FinancialReportTab';
import StockMutationReportTab from './reports/StockMutationReportTab';

const REPORT_TABS = [
  { key: 'financial', label: 'Laporan Laba / Rugi' },
  { key: 'stock', label: 'Persediaan & Kartu Mutasi' },
  { key: 'audit', label: 'Log Jejak Audit (Audit Trail)' },
];

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
  const { toast, showToast } = useToast();

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

  if (user && user.role !== 'owner') {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleApplyFilter = (e) => {
    e.preventDefault();
    if (!startInput || !endInput || startInput > endInput) {
      setDateError('Rentang tanggal filter tidak valid.');
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
      setDateError('Rentang tanggal filter tidak valid.');
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
      showToast(`Berkas ${filename} berhasil diunduh.`, 'success');
    } catch {
      showToast(
        `Gagal mengekspor laporan ke format ${format.toUpperCase()}.`,
        'error'
      );
    } finally {
      setExportingFormat(null);
    }
  };

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
          <div className="text-xs text-red-600 font-medium">{dateError}</div>
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
        <FinancialReportTab
          financialData={financialData}
          appliedPeriod={appliedPeriod}
          loading={loading}
        />
      )}

      {/* KONTEN TAB 2: PERSEDIAAN & KARTU MUTASI (STOCK) */}
      {activeTab === 'stock' && (
        <StockMutationReportTab stockData={stockData} loading={loading} />
      )}

      {/* KONTEN TAB 3: LOG JEJAK AUDIT (AUDIT TRAIL) */}
      {activeTab === 'audit' && (
        <AuditTrailReportTab auditData={auditData} loading={loading} />
      )}

      <ToastNotification toast={toast} />
    </div>
  );
}
