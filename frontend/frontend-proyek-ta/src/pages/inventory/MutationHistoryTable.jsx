import { History, Loader2 } from 'lucide-react';
import {
  MutationTypeBadge,
  StockChangeValue,
} from '../../components/common/StatusBadges';
import { MUTATION_FILTER_TABS } from '../../constants/productConstants';
import { formatDateTime } from '../../utils/formatters';

export default function MutationHistoryTable({
  products,
  mutations,
  loadingMutations,
  productFilter,
  typeFilter,
  onProductFilterChange,
  onTypeFilterChange,
}) {
  return (
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
            onChange={(e) => onProductFilterChange(e.target.value)}
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
                onClick={() => onTypeFilterChange(t.key)}
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
              <th className="py-2.5 px-3.5">Referensi &amp; Waktu</th>
              <th className="py-2.5 px-3.5">Produk &amp; Ring</th>
              <th className="py-2.5 px-3.5 text-center">Jenis Mutasi</th>
              <th className="py-2.5 px-3.5 text-right">Perubahan</th>
              <th className="py-2.5 px-3.5 text-right">Stok Akhir</th>
              <th className="py-2.5 px-3.5">Keterangan &amp; Petugas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 text-xs">
            {loadingMutations ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                  <span>Memuat riwayat kartu stok...</span>
                </td>
              </tr>
            ) : mutations.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  Belum ada riwayat log mutasi persediaan yang sesuai filter.
                </td>
              </tr>
            ) : (
              mutations.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900">
                      {row.reference_code || '—'}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                      {formatDateTime(row.created_at)}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="font-semibold text-slate-900">
                      {row.product_name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {row.product_code} • {row.ring_size}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                    <MutationTypeBadge type={row.mutation_type} />
                  </td>
                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    <StockChangeValue value={row.quantity_change} />
                  </td>
                  <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                    {row.stock_after} unit
                  </td>
                  <td className="py-2.5 px-3.5 max-w-xs">
                    <div className="text-slate-800 line-clamp-2">
                      {row.notes || <span className="text-slate-400">—</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Oleh: <span className="font-medium text-slate-700">{row.actor_name || '—'}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
