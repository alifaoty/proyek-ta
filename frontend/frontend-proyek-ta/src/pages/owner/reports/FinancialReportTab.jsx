import {
  Boxes,
  Loader2,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { EXPENSE_CATEGORY_LABELS } from '../../../constants/expenseConstants';
import {
  formatDateTime,
  formatReadableDate,
  rupiah,
} from '../../../utils/formatters';

export default function FinancialReportTab({
  financialData,
  appliedPeriod,
  loading,
}) {
  const finSummary = financialData.summary || {};
  const netProfit = Number(finSummary.net_estimated_profit || 0);
  const isProfitable = netProfit >= 0;

  return (
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
              {finSummary.total_transactions || 0} transaksi (
              {finSummary.total_items_sold || 0} unit)
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
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Ikhtisar Perhitungan Laba Rugi
            </h2>
            <span className="text-[11px] font-sans tabular-nums font-medium text-slate-500 whitespace-nowrap">
              {formatReadableDate(appliedPeriod.start_date)} &ndash;{' '}
              {formatReadableDate(appliedPeriod.end_date)}
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
                  Pendapatan Penjualan (Transaksi Lunas)
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
                        • {EXPENSE_CATEGORY_LABELS[eb.category] || eb.category}
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
                Rincian Transaksi Penjualan (Lunas)
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
                      Belum ada transaksi penjualan berstatus lunas pada periode
                      ini.
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
                          {String(sale.payment_method || '').toLowerCase() ===
                          'cash'
                            ? 'Tunai'
                            : sale.payment_method}
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
  );
}
