// Validasi form penerimaan barang masuk (Inbound)
export function validateInboundForm(header, rows) {
  const e = { rows: {} };
  if (!header.supplier_name.trim()) e.supplier_name = 'Nama supplier wajib diisi';
  if (!header.received_date) e.received_date = 'Tanggal penerimaan wajib diisi';
  rows.forEach((r) => {
    const re = {};
    if (!r.product_id) re.product_id = 'Pilih produk';
    if (!(Number.isInteger(Number(r.quantity)) && Number(r.quantity) > 0)) re.quantity = 'Harus bilangan bulat > 0';
    if (r.purchase_price === '' || Number(r.purchase_price) < 0) re.purchase_price = 'Harga tidak valid';
    if (Object.keys(re).length) e.rows[r.key] = re;
  });
  const ids = rows.map((r) => r.product_id).filter(Boolean);
  if (new Set(ids).size !== ids.length) e.rowsGeneral = 'Produk yang sama dipilih lebih dari satu baris';
  return e;
}

// Validasi form pengeluaran barang non-penjualan (Outbound)
export function validateOutboundForm({ form, qty, overStock, product }) {
  const e = {};
  if (!form.product_id) e.product_id = 'Pilih produk';
  if (!(Number.isInteger(qty) && qty > 0))
    e.quantity = 'Kuantitas harus bilangan bulat > 0';
  else if (overStock)
    e.quantity = `Melebihi stok fisik (${product.current_stock} unit)`;
  if (!form.reason) e.reason = 'Pilih alasan mutasi';
  return e;
}

// Validasi form pencatatan fisik stock opname
export function validateOpnameForm({ productId, physicalStock }) {
  const nextErrors = {};
  if (!productId) {
    nextErrors.product_id = 'Silakan pilih produk ban atau velg terlebih dahulu.';
  }
  const physNum = Number(physicalStock);
  if (
    physicalStock === '' ||
    !Number.isInteger(physNum) ||
    physNum < 0
  ) {
    nextErrors.physical_stock =
      'Stok fisik wajib berupa angka bulat 0 atau lebih.';
  }
  return nextErrors;
}
