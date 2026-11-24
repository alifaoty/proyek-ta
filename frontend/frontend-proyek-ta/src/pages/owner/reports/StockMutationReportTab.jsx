import { Boxes, History, Loader2, PackageCheck, Wallet } from 'lucide-react';
import {
  MutationTypeBadge,
  StockChangeValue,
} from '../../../components/common/StatusBadges';
import { formatDateTime, rupiah } from '../../../utils/formatters';

export default function StockMutationReportTab({ stockData, loading }) {
  return (
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
              <span className="text-xs font-semibold text-slate-500">SKU</span>
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
              <span className="text-xs font-semibold text-slate-500">unit</span>
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
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                    <span>Memuat kartu mutasi persediaan...</span>
                  </td>
                </tr>
              ) : !stockData.mutations?.length ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada pergerakan mutasi stok pada rentang tanggal ini.
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
                        <span className="font-mono">{row.product_code}</span> •{' '}
                        {row.ring_size}
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
                        {row.notes || <span className="text-slate-400">—</span>}
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
  );
}
