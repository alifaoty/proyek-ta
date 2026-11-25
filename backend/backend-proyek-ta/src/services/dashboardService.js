const db = require('../config/database');

/**
 * Mengambil ringkasan eksekutif untuk Dashboard Owner secara paralel:
 * - KPI omzet hari ini, omzet bulan berjalan, HPP/laba kotor, biaya operasional, laba bersih, unit terjual, dan jumlah stok opname pending.
 * - Daftar tiket stock_opnames berstatus 'pending'.
 * - Daftar produk dengan current_stock = 0 (stok habis).
 */
const getOwnerDashboardSummary = async () => {
  const [
    [todayRevRows],
    [monthlyRevRows],
    [monthlyItemRows],
    [monthlyExpRows],
    [pendingOpnameRows],
    [outOfStockRows],
  ] = await Promise.all([
    // 1. Omzet penjualan lunas hari ini
    db.execute(
      `SELECT COALESCE(SUM(t.grand_total), 0) AS today_revenue
       FROM transactions t
       WHERE t.payment_status IN ('paid', 'settlement')
         AND DATE(t.created_at) = CURDATE()`
    ),

    // 2. Omzet penjualan lunas bulan & tahun berjalan
    db.execute(
      `SELECT COALESCE(SUM(t.grand_total), 0) AS monthly_revenue
       FROM transactions t
       WHERE t.payment_status IN ('paid', 'settlement')
         AND YEAR(t.created_at) = YEAR(CURDATE())
         AND MONTH(t.created_at) = MONTH(CURDATE())`
    ),

    // 3. Total HPP, item gross profit, dan total unit terjual bulan & tahun berjalan
    db.execute(
      `SELECT
         COALESCE(SUM(ti.quantity * ti.cost_price), 0) AS monthly_cogs,
         COALESCE(SUM((ti.unit_price - ti.cost_price) * ti.quantity), 0) AS item_gross_profit,
         COALESCE(SUM(ti.quantity), 0) AS monthly_units_sold
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.payment_status IN ('paid', 'settlement')
         AND YEAR(t.created_at) = YEAR(CURDATE())
         AND MONTH(t.created_at) = MONTH(CURDATE())`
    ),

    // 4. Total biaya operasional bulan & tahun berjalan
    db.execute(
      `SELECT COALESCE(SUM(oe.amount), 0) AS monthly_expenses
       FROM operational_expenses oe
       WHERE YEAR(oe.expense_date) = YEAR(CURDATE())
         AND MONTH(oe.expense_date) = MONTH(CURDATE())`
    ),

    // 5. Daftar tiket stok opname yang menunggu persetujuan Owner (status = 'pending')
    db.execute(
      `SELECT
         so.id,
         so.opname_code,
         so.product_id,
         p.code AS product_code,
         p.name AS product_name,
         p.category,
         p.ring_size,
         so.system_stock,
         so.physical_stock,
         (so.physical_stock - so.system_stock) AS difference,
         so.notes,
         so.status,
         so.checked_by,
         u.name AS creator_name,
         u.name AS checked_by_name,
         so.created_at
       FROM stock_opnames so
       JOIN products p ON so.product_id = p.id
       JOIN users u ON so.checked_by = u.id
       WHERE so.status = 'pending'
       ORDER BY so.created_at DESC, so.id DESC`
    ),

    // 6. Daftar produk dengan stok habis (current_stock = 0)
    db.execute(
      `SELECT
         id,
         code,
         name,
         category,
         item_condition,
         ring_size,
         current_stock
       FROM products
       WHERE current_stock = 0
       ORDER BY name ASC`
    ),
  ]);

  const todayRevenue = Number(todayRevRows[0]?.today_revenue || 0);
  const monthlyRevenue = Number(monthlyRevRows[0]?.monthly_revenue || 0);
  const monthlyCogs = Number(monthlyItemRows[0]?.monthly_cogs || 0);
  // Selaras dengan laporan finansial (/api/reports/financial): Laba Kotor = Omzet (setelah diskon) - HPP
  const monthlyGrossProfit = monthlyRevenue - monthlyCogs;
  const monthlyExpenses = Number(monthlyExpRows[0]?.monthly_expenses || 0);
  const monthlyNetProfit = monthlyGrossProfit - monthlyExpenses;
  const monthlyUnitsSold = Number(monthlyItemRows[0]?.monthly_units_sold || 0);

  const pendingOpnames = pendingOpnameRows.map((row) => ({
    id: row.id,
    opname_code: row.opname_code,
    product_id: row.product_id,
    product_code: row.product_code,
    product_name: row.product_name,
    category: row.category,
    ring_size: row.ring_size,
    system_stock: Number(row.system_stock || 0),
    physical_stock: Number(row.physical_stock || 0),
    difference: Number(row.difference || 0),
    notes: row.notes,
    status: row.status,
    checked_by: row.checked_by,
    creator_name: row.creator_name,
    checked_by_name: row.checked_by_name,
    created_at: row.created_at,
  }));

  const outOfStockProducts = outOfStockRows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    item_condition: row.item_condition,
    ring_size: row.ring_size,
    current_stock: Number(row.current_stock || 0),
  }));

  return {
    kpis: {
      today_revenue: todayRevenue,
      monthly_revenue: monthlyRevenue,
      monthly_gross_profit: monthlyGrossProfit,
      monthly_expenses: monthlyExpenses,
      monthly_net_profit: monthlyNetProfit,
      monthly_units_sold: monthlyUnitsSold,
      pending_opname_count: pendingOpnames.length,
    },
    pending_opnames: pendingOpnames,
    out_of_stock_products: outOfStockProducts,
  };
};

module.exports = {
  getOwnerDashboardSummary,
};
