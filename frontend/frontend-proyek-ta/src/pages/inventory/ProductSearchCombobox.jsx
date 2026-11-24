import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, PackageCheck, Search, X } from 'lucide-react';

export default function ProductSearchCombobox({
  products = [],
  selectedProduct = null,
  onSelect,
  disabled = false,
  error,
}) {
  const [productSearch, setProductSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const comboboxRef = useRef(null);
  const searchInputRef = useRef(null);

  // Tutup dropdown combobox saat klik di luar area combobox
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div className="space-y-3">
      <div ref={comboboxRef} className="relative">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
          Cari &amp; Pilih Produk Ban / Velg{' '}
          <span className="text-rose-600">*</span>
        </label>

        {selectedProduct ? (
          /* Tampilan Terpilih dengan Tombol Reset (X) 1-Klik */
          <div
            className={`w-full h-10 px-3 bg-white border rounded-lg text-xs text-slate-900 flex items-center justify-between gap-2 transition ${
              error
                ? 'border-rose-500 ring-2 ring-rose-100'
                : 'border-blue-600 ring-2 ring-blue-100/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 shrink-0">
                {selectedProduct.code}
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {selectedProduct.name}
              </span>
              <span className="font-sans tabular-nums text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                {selectedProduct.ring_size}
              </span>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onSelect(null);
                setProductSearch('');
                setDropdownOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              title="Ganti produk"
              aria-label="Ganti produk"
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Input Combobox Pencarian Terpadu */
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              disabled={disabled}
              value={productSearch}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDropdownOpen(false);
                }
              }}
              placeholder="Cari nama barang, kode SKU, atau ukuran ring..."
              className={`w-full h-10 pl-9 pr-9 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 outline-none transition disabled:bg-slate-100 ${
                error
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            {productSearch ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setProductSearch('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setDropdownOpen((o) => !o)}
                aria-label="Buka daftar produk"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Panel Dropdown Hasil Pencarian Combobox */}
        {dropdownOpen && !selectedProduct && !disabled && (
          <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20 divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500 text-center">
                Tidak ada produk yang cocok dengan &ldquo;{productSearch}&rdquo;
              </div>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    setProductSearch('');
                    setDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/70 transition flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        {p.code}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          p.category === 'ban'
                            ? 'bg-slate-800 text-white border-slate-900'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {p.category === 'ban' ? 'Ban' : 'Velg'}
                      </span>
                      <span className="font-sans tabular-nums text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        {p.ring_size}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate mt-1">
                      {p.name}
                    </div>
                    {p.specification && (
                      <div className="text-[11px] font-medium text-slate-600 tabular-nums">
                        {p.specification}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      Stok Sistem
                    </div>
                    <div className="font-sans tabular-nums text-xs font-bold text-slate-900">
                      {p.current_stock} unit
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-600 font-medium mt-1">{error}</div>
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
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  selectedProduct.category === 'ban'
                    ? 'bg-slate-800 text-white border-slate-900'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {selectedProduct.category === 'ban' ? 'Ban' : 'Velg'}
              </span>
              <span className="font-sans tabular-nums text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {selectedProduct.ring_size}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1 truncate">
              {selectedProduct.name}
            </div>
            <div className="text-xs font-medium text-slate-600 tabular-nums mt-0.5">
              {selectedProduct.specification || '—'}
            </div>
          </div>

          <div className="text-right shrink-0 px-3 py-2 rounded-lg bg-white border border-slate-200">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Stok Sistem
            </div>
            <div className="font-sans tabular-nums text-lg font-bold text-slate-900 flex items-center justify-end gap-1">
              <PackageCheck className="w-4 h-4 text-blue-600" />
              <span>{selectedProduct.current_stock}</span>
              <span className="text-xs font-normal text-slate-500">unit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
