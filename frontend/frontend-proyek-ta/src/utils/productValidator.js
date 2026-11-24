export const EMPTY_PRODUCT_FORM = {
  code: '',
  name: '',
  category: 'ban',
  item_condition: 'baru',
  ring_size: 'R15',
  specification: '',
  purchase_price: '',
  selling_price: '',
  current_stock: '',
};

export function validateProductForm(f) {
  const e = {};
  if (!f.code.trim()) e.code = 'Kode produk wajib diisi.';
  if (!f.name.trim()) e.name = 'Nama produk wajib diisi.';
  if (!f.ring_size) e.ring_size = 'Ukuran ring wajib dipilih.';
  const num = (key, label, int) => {
    const v = f[key];
    if (v === '' || v === null) e[key] = `${label} wajib diisi.`;
    else if (Number(v) < 0) e[key] = `${label} tidak boleh bernilai negatif.`;
    else if (int && !Number.isInteger(Number(v))) e[key] = `${label} harus berupa bilangan bulat.`;
  };
  num('purchase_price', 'Harga beli');
  num('selling_price', 'Harga jual');
  num('current_stock', 'Stok', true);
  if (!e.purchase_price && !e.selling_price && Number(f.selling_price) < Number(f.purchase_price)) {
    e.selling_price = 'Harga jual tidak boleh lebih rendah dari harga beli.';
  }
  return e;
}
