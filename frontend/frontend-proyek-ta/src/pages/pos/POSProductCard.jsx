import { rupiah } from "../../utils/formatters";

export default function POSProductCard({ product, inCartQty, onSelect }) {
  const available = product.current_stock > 0;

  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => onSelect(product)}
      className={`group relative bg-white border rounded-xl p-3.5 text-left transition flex flex-col justify-between gap-2.5 shadow-2xs ${
        !available
          ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
          : inCartQty > 0
            ? "border-blue-600 ring-1 ring-blue-600 hover:shadow-md cursor-pointer"
            : "border-slate-200/90 hover:border-blue-500 hover:shadow-sm cursor-pointer"
      }`}
    >
      {/* Baris Atas: SKU, Ring, & Status Stok */}
      <div className="flex items-center justify-between gap-1.5 w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            {product.code}
          </span>
          <span className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
            {product.ring_size}
          </span>
        </div>

        {available ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 font-mono">
            Stok: {product.current_stock}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
            Habis
          </span>
        )}
      </div>

      {/* Nama Produk & Spesifikasi */}
      <div>
        <div className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {product.name}
        </div>
        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
          {product.specification ||
            (product.category === "ban" ? "Ban" : "Velg")}{" "}
          • {product.item_condition === "baru" ? "Baru" : "Bekas"}
        </div>
      </div>

      {/* Harga Jual & Indikator Keranjang */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 w-full">
        <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
          {rupiah(product.selling_price)}
        </span>
        {inCartQty > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold">
            {inCartQty}x di keranjang
          </span>
        )}
      </div>
    </button>
  );
}
