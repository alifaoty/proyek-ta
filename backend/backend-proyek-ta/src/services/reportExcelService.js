const ExcelJS = require('exceljs');
const { formatRupiahText } = require('../utils/formatters');
const { EXPENSE_CATEGORY_LABELS } = require('./reportDataService');

const createBaseWorkbook = () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Inventori & POS Toko Ban & Velg';
  workbook.created = new Date();
  return workbook;
};

/**
 * Membentuk workbook Excel (.xlsx) untuk laporan finansial & perhitungan laba rugi.
 */
const buildFinancialExcel = (fin, range = {}) => {
  const startDate = range.startDate || fin.period?.start_date;
  const endDate = range.endDate || fin.period?.end_date;

  const workbook = createBaseWorkbook();
  const sheet = workbook.addWorksheet('Laporan Finansial');

  sheet.addRow(['TOKO BAN & VELG - LAPORAN FINANSIAL & LABA RUGI']);
  sheet.addRow([`Periode: ${startDate} s.d. ${endDate}`]);
  sheet.addRow([]);

  sheet.getRow(1).font = { bold: true, size: 13 };
  sheet.getRow(2).font = { italic: true, size: 10 };

  const summaryHeader = sheet.addRow(['Komponen Laba Rugi', 'Nominal (Rp)']);
  summaryHeader.font = { bold: true };

  const summaryItems = [
    ['Total Omzet Penjualan (Lunas)', fin.summary.total_revenue],
    ['Total Harga Pokok Penjualan (HPP)', fin.summary.total_cogs_hpp],
    ['Laba Kotor (Gross Profit)', fin.summary.gross_profit],
    ['Total Biaya Operasional', fin.summary.total_operational_expenses],
    ['Estimasi Laba Bersih (Net Profit)', fin.summary.net_estimated_profit],
  ];
  summaryItems.forEach(([label, val]) => {
    const r = sheet.addRow([label, val]);
    r.getCell(2).numFmt = '#,##0';
  });

  sheet.addRow([]);
  const expHeader = sheet.addRow([
    'Rincian Biaya Operasional per Kategori',
    'Total (Rp)',
  ]);
  expHeader.font = { bold: true };
  fin.expense_breakdown.forEach((eb) => {
    const r = sheet.addRow([
      EXPENSE_CATEGORY_LABELS[eb.category] || eb.category,
      eb.total,
    ]);
    r.getCell(2).numFmt = '#,##0';
  });

  sheet.addRow([]);
  const salesTitle = sheet.addRow(['Daftar Transaksi Penjualan (Lunas)']);
  salesTitle.font = { bold: true };
  const salesHeader = sheet.addRow([
    'No Faktur',
    'Tanggal',
    'Metode Bayar',
    'Kasir',
    'Grand Total (Rp)',
  ]);
  salesHeader.font = { bold: true };
  fin.recent_sales.forEach((s) => {
    const r = sheet.addRow([
      s.invoice_code,
      new Date(s.transaction_date).toLocaleString('id-ID'),
      String(s.payment_method).toUpperCase(),
      s.cashier_name,
      s.grand_total,
    ]);
    r.getCell(5).numFmt = '#,##0';
  });

  sheet.columns = [
    { width: 38 },
    { width: 24 },
    { width: 16 },
    { width: 22 },
    { width: 22 },
  ];

  return workbook;
};

/**
 * Membentuk workbook Excel (.xlsx) untuk laporan persediaan & kartu mutasi stok.
 */
const buildStockExcel = (stk, range = {}) => {
  const startDate = range.startDate || stk.period?.start_date;
  const endDate = range.endDate || stk.period?.end_date;

  const workbook = createBaseWorkbook();
  const sheet = workbook.addWorksheet('Mutasi Persediaan');

  sheet.addRow(['TOKO BAN & VELG - LAPORAN PERSEDIAAN & KARTU MUTASI STOK']);
  sheet.addRow([`Periode: ${startDate} s.d. ${endDate}`]);
  sheet.addRow([
    `Total SKU: ${stk.summary.total_sku}`,
    `Total Unit Fisik: ${stk.summary.total_physical_units}`,
    `Nilai Aset Persediaan: ${formatRupiahText(stk.summary.total_inventory_value)}`,
  ]);
  sheet.addRow([]);

  sheet.getRow(1).font = { bold: true, size: 13 };
  sheet.getRow(2).font = { italic: true, size: 10 };
  sheet.getRow(3).font = { bold: true, size: 10 };

  const header = sheet.addRow([
    'Referensi',
    'Tanggal & Waktu',
    'Kode SKU',
    'Nama Produk',
    'Ring',
    'Jenis Mutasi',
    'Perubahan',
    'Stok Akhir',
    'Petugas',
    'Keterangan',
  ]);
  header.font = { bold: true };

  stk.mutations.forEach((m) => {
    sheet.addRow([
      m.reference_code || '-',
      new Date(m.created_at).toLocaleString('id-ID'),
      m.product_code,
      m.product_name,
      m.ring_size,
      m.mutation_type,
      m.quantity_change,
      m.stock_after,
      m.actor_name || '-',
      m.notes || '-',
    ]);
  });

  sheet.columns = [
    { width: 20 },
    { width: 22 },
    { width: 16 },
    { width: 28 },
    { width: 10 },
    { width: 22 },
    { width: 12 },
    { width: 12 },
    { width: 18 },
    { width: 32 },
  ];

  return workbook;
};

/**
 * Membentuk workbook Excel (.xlsx) untuk laporan log jejak audit (audit trail).
 */
const buildAuditExcel = (aud, range = {}) => {
  const startDate = range.startDate || aud.period?.start_date;
  const endDate = range.endDate || aud.period?.end_date;

  const workbook = createBaseWorkbook();
  const sheet = workbook.addWorksheet('Audit Trail');

  sheet.addRow(['TOKO BAN & VELG - LOG JEJAK AUDIT SISTEM']);
  sheet.addRow([`Periode: ${startDate} s.d. ${endDate}`]);
  sheet.addRow([]);

  sheet.getRow(1).font = { bold: true, size: 13 };
  sheet.getRow(2).font = { italic: true, size: 10 };

  const header = sheet.addRow([
    'ID',
    'Waktu',
    'Pengguna',
    'Peran',
    'Aksi',
    'Endpoint',
    'Deskripsi',
  ]);
  header.font = { bold: true };

  aud.logs.forEach((log) => {
    sheet.addRow([
      log.id,
      new Date(log.created_at).toLocaleString('id-ID'),
      log.user_name || 'System',
      log.user_role || '-',
      log.action,
      log.endpoint || '-',
      log.description || '-',
    ]);
  });

  sheet.columns = [
    { width: 8 },
    { width: 22 },
    { width: 20 },
    { width: 12 },
    { width: 26 },
    { width: 28 },
    { width: 45 },
  ];

  return workbook;
};

module.exports = {
  buildFinancialExcel,
  buildStockExcel,
  buildAuditExcel,
};
