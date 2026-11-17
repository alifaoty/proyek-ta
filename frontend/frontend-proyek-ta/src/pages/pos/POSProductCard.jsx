import { rupiah } from "../../utils/formatters";

export default function POSProductCard({ product, inCartQty, onSelect }) {
  const available = product.current_stock > 0;

  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => onSelect(product)}
      className={`group relative rounded-xl p-3 text-left transition flex flex-col justify-between gap-2 shadow-2xs border ${
        !available
          ? "cursor-not-allowed border-slate-200 bg-slate-50/90"
          : inCartQty > 0
            ? "bg-white border-blue-600 ring-1 ring-blue-600 hover:shadow-md cursor-pointer"
            : "bg-white border-slate-200/90 hover:border-blue-500 hover:shadow-sm cursor-pointer"
      }`}
    >
      {/* Baris Atas: SKU, Kategori, & Status Stok */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            {product.code}
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              product.category === "ban"
                ? "bg-slate-800 text-white border-slate-900"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
          >
            {product.category === "ban" ? "Ban" : "Velg"}
          </span>
        </div>

        {available ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sans tabular-nums font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            Stok: {product.current_stock}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
            Habis
          </span>
        )}
      </div>

      {/* Nama Produk & Hierarki Spesifikasi Ukuran/Ring */}
      <div className="space-y-1">
        <div
          className={`text-xs font-bold line-clamp-1 transition-colors ${
            available
              ? "text-slate-900 group-hover:text-blue-600"
              : "text-slate-700"
          }`}
        >
          {product.name}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans tabular-nums">
          <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[11px]">
            {product.ring_size}
          </span>
          {product.specification && (
            <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded text-[11px] truncate max-w-[140px]">
              {product.specification}
            </span>
          )}
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              product.item_condition === "baru"
                ? "bg-blue-50/70 text-blue-700 border-blue-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {product.item_condition === "baru" ? "Baru" : "Bekas"}
          </span>
        </div>
      </div>

      {/* Harga Jual & Indikator Keranjang */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 w-full">
        <span
          className={`font-sans tabular-nums text-sm font-bold ${
            available ? "text-slate-900" : "text-slate-600"
          }`}
        >
          {rupiah(product.selling_price)}
        </span>
        {inCartQty > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-sans tabular-nums text-[10px] font-bold">
            {inCartQty}x di keranjang
          </span>
        )}
      </div>
    </button>
  );
}
