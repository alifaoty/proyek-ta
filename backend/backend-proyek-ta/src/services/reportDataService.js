const db = require('../config/database');
const { normalizeAuditDescription } = require('../utils/formatters');
const { isPositiveInt } = require('../utils/validators');

const VALID_MUTATION_TYPES = [
  'masuk',
  'penjualan',
  'keluar_non_penjualan',
  'penyesuaian',
  'adjustment_opname',
];

const EXPENSE_CATEGORY_LABELS = {
  listrik_air_internet: 'Listrik, Air & Internet',
  perlengkapan_bengkel: 'Perlengkapan Bengkel',
  konsumsi_toko: 'Konsumsi Toko',
  perawatan_alat: 'Perawatan Alat',
  lain_lain: 'Lain-lain',
};

// Deteksi kolom tanggal transaksi pada tabel transactions (transaction_date atau created_at)
let cachedTrxDateCol = null;
const getTrxDateCol = async () => {
  if (cachedTrxDateCol) return cachedTrxDateCol;
  try {
    const [cols] = await db.query('SHOW COLUMNS FROM transactions');
    const fieldNames = cols.map((c) => c.Field || c.field);
    cachedTrxDateCol = fieldNames.includes('transaction_date')
      ? 'transaction_date'
      : 'created_at';
  } catch {
    cachedTrxDateCol = 'created_at';
  }
  return cachedTrxDateCol;
};

/**
 * Mengambil data agregasi laporan finansial & perhitungan laba rugi (tanpa req/res Express).
 */
const fetchFinancialReportData = async (startDate, endDate) => {
  const trxDateCol = await getTrxDateCol();

  const [revRows] = await db.execute(
    `SELECT
       COALESCE(SUM(t.grand_total), 0) AS total_revenue,
       COUNT(t.id) AS total_transactions
     FROM transactions t
     WHERE t.payment_status = 'settlement'
       AND DATE(t.${trxDateCol}) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const [cogsRows] = await db.execute(
    `SELECT
       COALESCE(SUM(ti.quantity * ti.cost_price), 0) AS total_cogs_hpp,
       COALESCE(SUM(ti.quantity), 0) AS total_items_sold
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.payment_status = 'settlement'
       AND DATE(t.${trxDateCol}) BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const [expRows] = await db.execute(
    `SELECT
       category,
       COALESCE(SUM(amount), 0) AS total
     FROM operational_expenses
     WHERE expense_date BETWEEN ? AND ?
     GROUP BY category
     ORDER BY total DESC`,
    [startDate, endDate]
  );

  const [salesRows] = await db.execute(
    `SELECT
       t.id,
       t.invoice_code,
       t.invoice_code AS invoice_number,
       t.${trxDateCol} AS transaction_date,
       t.created_at,
       t.payment_method,
       t.payment_status,
       t.subtotal,
       t.discount,
       t.grand_total,
       u.name AS cashier_name
     FROM transactions t
     JOIN users u ON t.cashier_id = u.id
     WHERE t.payment_status = 'settlement'
       AND DATE(t.${trxDateCol}) BETWEEN ? AND ?
     ORDER BY t.${trxDateCol} DESC, t.id DESC
     LIMIT 100`,
    [startDate, endDate]
  );

  const totalRevenue = Number(revRows[0]?.total_revenue || 0);
  const totalTransactions = Number(revRows[0]?.total_transactions || 0);
  const totalCogsHpp = Number(cogsRows[0]?.total_cogs_hpp || 0);
  const totalItemsSold = Number(cogsRows[0]?.total_items_sold || 0);
  const grossProfit = totalRevenue - totalCogsHpp;

  const expenseBreakdown = expRows.map((row) => ({
    category: row.category,
    total: Number(row.total || 0),
  }));
  const totalOperationalExpenses = expenseBreakdown.reduce(
    (sum, item) => sum + item.total,
    0
  );
  const netEstimatedProfit = grossProfit - totalOperationalExpenses;

  const recentSales = salesRows.map((row) => ({
    id: row.id,
    invoice_code: row.invoice_code,
    invoice_number: row.invoice_number,
    transaction_date: row.transaction_date,
    created_at: row.created_at,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    grand_total: Number(row.grand_total || 0),
    cashier_name: row.cashier_name,
  }));

  return {
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_revenue: totalRevenue,
      total_cogs_hpp: totalCogsHpp,
      gross_profit: grossProfit,
      total_operational_expenses: totalOperationalExpenses,
      net_estimated_profit: netEstimatedProfit,
      total_transactions: totalTransactions,
      total_items_sold: totalItemsSold,
    },
    expense_breakdown: expenseBreakdown,
    recent_sales: recentSales,
  };
};

/**
 * Mengambil data laporan persediaan & kartu mutasi stok (tanpa req/res Express).
 * Mendukung pemanggilan fetchStockMutationsReportData(filters, startDate, endDate)
 * maupun fetchStockMutationsReportData({ ...filters, startDate, endDate }).
 */
const fetchStockMutationsReportData = async (filters = {}, startArg, endArg) => {
  const startDate = startArg || filters.startDate || filters.start_date;
  const endDate = endArg || filters.endDate || filters.end_date;

  const [assetRows] = await db.execute(
    `SELECT
       COUNT(*) AS total_sku,
       COALESCE(SUM(current_stock), 0) AS total_physical_units,
       COALESCE(SUM(current_stock * purchase_price), 0) AS total_inventory_value,
       COALESCE(SUM(CASE WHEN current_stock > 0 THEN 1 ELSE 0 END), 0) AS available_sku,
       COALESCE(SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END), 0) AS empty_sku
     FROM products`
  );

  const where = ['DATE(sml.created_at) BETWEEN ? AND ?'];
  const params = [startDate, endDate];

  if (filters.product_id !== undefined && String(filters.product_id).trim() !== '') {
    if (!isPositiveInt(filters.product_id)) {
      return { error: 'Filter product_id tidak valid' };
    }
    where.push('sml.product_id = ?');
    params.push(Number(filters.product_id));
  }

  if (
    filters.mutation_type !== undefined &&
    String(filters.mutation_type).trim() !== ''
  ) {
    const mType = String(filters.mutation_type).trim();
    if (!VALID_MUTATION_TYPES.includes(mType)) {
      return { error: 'Filter mutation_type tidak valid' };
    }
    if (mType === 'penyesuaian') {
      where.push("sml.mutation_type IN ('penyesuaian', 'adjustment_opname')");
    } else {
      where.push('sml.mutation_type = ?');
      params.push(mType);
    }
  }

  let limit = 100;
  if (filters.limit !== undefined && String(filters.limit).trim() !== '') {
    if (!isPositiveInt(filters.limit)) {
      return { error: 'Parameter limit harus bilangan bulat positif' };
    }
    limit = Math.min(Number(filters.limit), 1000);
  }

  const [rows] = await db.query(
    `SELECT
       sml.id,
       sml.product_id,
       p.code AS product_code,
       p.name AS product_name,
       p.category,
       p.ring_size,
       sml.mutation_type,
       sml.reference_code,
       sml.quantity_change,
       sml.stock_after,
       sml.notes,
       u.name AS actor_name,
       sml.created_at
     FROM stock_mutation_logs sml
     JOIN products p ON p.id = sml.product_id
     LEFT JOIN users u ON u.id = sml.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY sml.id DESC
     LIMIT ?`,
    [...params, limit]
  );

  const asset = assetRows[0] || {};
  const mutations = rows.map((r) => ({
    ...r,
    quantity_change: Number(r.quantity_change || 0),
    stock_after: Number(r.stock_after || 0),
  }));

  return {
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_sku: Number(asset.total_sku || 0),
      total_physical_units: Number(asset.total_physical_units || 0),
      total_inventory_value: Number(asset.total_inventory_value || 0),
      available_sku: Number(asset.available_sku || 0),
      empty_sku: Number(asset.empty_sku || 0),
    },
    mutations,
  };
};

/**
 * Mengambil data jejak audit (audit_trails) (tanpa req/res Express).
 */
const fetchAuditTrailsReportData = async (filters = {}, startArg, endArg) => {
  const startDate = startArg || filters.startDate || filters.start_date;
  const endDate = endArg || filters.endDate || filters.end_date;

  const where = ['DATE(at.created_at) BETWEEN ? AND ?'];
  const params = [startDate, endDate];

  if (filters.action !== undefined && String(filters.action).trim() !== '') {
    where.push('at.action = ?');
    params.push(String(filters.action).trim());
  }

  if (filters.user_id !== undefined && String(filters.user_id).trim() !== '') {
    if (!isPositiveInt(filters.user_id)) {
      return { error: 'Filter user_id tidak valid' };
    }
    where.push('at.user_id = ?');
    params.push(Number(filters.user_id));
  }

  let limit = 100;
  if (filters.limit !== undefined && String(filters.limit).trim() !== '') {
    if (!isPositiveInt(filters.limit)) {
      return { error: 'Parameter limit harus bilangan bulat positif' };
    }
    limit = Math.min(Number(filters.limit), 1000);
  }

  const [rows] = await db.query(
    `SELECT
       at.id,
       at.user_id,
       u.name AS user_name,
       u.role AS user_role,
       at.action,
       at.endpoint,
       at.description,
       at.created_at
     FROM audit_trails at
     LEFT JOIN users u ON at.user_id = u.id
     WHERE ${where.join(' AND ')}
     ORDER BY at.created_at DESC, at.id DESC
     LIMIT ?`,
    [...params, limit]
  );

  const formattedLogs = rows.map((row) => ({
    ...row,
    description: normalizeAuditDescription(row.description),
  }));

  return {
    period: { start_date: startDate, end_date: endDate },
    total_records: formattedLogs.length,
    logs: formattedLogs,
  };
};

module.exports = {
  EXPENSE_CATEGORY_LABELS,
  VALID_MUTATION_TYPES,
  fetchFinancialReportData,
  fetchStockMutationsReportData,
  fetchAuditTrailsReportData,
};
