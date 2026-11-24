const { HttpError } = require('../utils/httpHelper');

/**
 * Memproses daftar item keranjang belanja POS secara atomik di dalam transaksi DB yang sedang berjalan:
 * 1. Mengunci baris produk (SELECT ... FOR UPDATE).
 * 2. Memvalidasi ketersediaan stok fisik (melempar HttpError 400 jika stok kurang).
 * 3. Menyimpan detail item beserta cost_price (HPP historis) ke transaction_items.
 * 4. Mengurangi current_stock pada tabel products.
 * 5. Mencatat mutasi keluar ke stock_mutation_logs (mutation_type = 'penjualan').
 */
const processPosItemsAndStock = async (
  conn,
  { items, transactionId, invoiceCode, cashierId, mutationNotePrefix = 'Penjualan Kasir POS' }
) => {
  for (const item of items) {
    const productId = Number(item.product_id);
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unit_price);

    const [prodRows] = await conn.execute(
      'SELECT name, purchase_price, current_stock FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );
    if (prodRows.length === 0) {
      throw new HttpError(404, `Produk dengan ID ${productId} tidak ditemukan.`);
    }

    const product = prodRows[0];
    const currentStock = Number(product.current_stock);

    if (qty > currentStock) {
      throw new HttpError(
        400,
        `Stok produk ${product.name} tidak mencukupi (sisa: ${currentStock} unit)`
      );
    }

    const costPrice = Number(product.purchase_price);
    const itemSubtotal = qty * unitPrice;
    const stockAfter = currentStock - qty;

    await conn.execute(
      `INSERT INTO transaction_items
        (transaction_id, product_id, quantity, cost_price, unit_price, subtotal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [transactionId, productId, qty, costPrice, unitPrice, itemSubtotal]
    );

    await conn.execute(
      'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
      [qty, productId]
    );

    await conn.execute(
      `INSERT INTO stock_mutation_logs
        (product_id, mutation_type, reference_code, quantity_change, stock_after, notes, user_id)
       VALUES (?, 'penjualan', ?, ?, ?, ?, ?)`,
      [
        productId,
        invoiceCode,
        -Math.abs(qty),
        stockAfter,
        `${mutationNotePrefix}: ${invoiceCode}`,
        cashierId,
      ]
    );
  }
};

module.exports = {
  processPosItemsAndStock,
};
