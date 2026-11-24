const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../config/database');
const { formatRupiahText, normalizeAuditDescription } = require('../utils/formatters');
const { fail, handleControllerError } = require('../utils/httpHelper');
const { isPositiveInt, resolveDateRange } = require('../utils/validators');

const VALID_EXPORT_TYPES = ['financial', 'stock', 'audit'];
const VALID_EXPORT_FORMATS = ['pdf', 'xlsx'];
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

// Helper internal untuk mengambil data laporan finansial
const buildFinancialData = async (startDate, endDate) => {
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

// Helper internal untuk mengambil data laporan persediaan & mutasi stok
const buildStockMutationsData = async (query = {}, startDate, endDate) => {
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

  if (query.product_id !== undefined && String(query.product_id).trim() !== '') {
    if (!isPositiveInt(query.product_id)) {
      return { error: 'Filter product_id tidak valid' };
    }
    where.push('sml.product_id = ?');
    params.push(Number(query.product_id));
  }

  if (
    query.mutation_type !== undefined &&
    String(query.mutation_type).trim() !== ''
  ) {
    const mType = String(query.mutation_type).trim();
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
  if (query.limit !== undefined && String(query.limit).trim() !== '') {
    if (!isPositiveInt(query.limit)) {
      return { error: 'Parameter limit harus bilangan bulat positif' };
    }
    limit = Math.min(Number(query.limit), 1000);
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

// Helper internal untuk mengambil data jejak audit (audit_trails)
const buildAuditTrailsData = async (query = {}, startDate, endDate) => {
  const where = ['DATE(at.created_at) BETWEEN ? AND ?'];
  const params = [startDate, endDate];

  if (query.action !== undefined && String(query.action).trim() !== '') {
    where.push('at.action = ?');
    params.push(String(query.action).trim());
  }

  if (query.user_id !== undefined && String(query.user_id).trim() !== '') {
    if (!isPositiveInt(query.user_id)) {
      return { error: 'Filter user_id tidak valid' };
    }
    where.push('at.user_id = ?');
    params.push(Number(query.user_id));
  }

  let limit = 100;
  if (query.limit !== undefined && String(query.limit).trim() !== '') {
    if (!isPositiveInt(query.limit)) {
      return { error: 'Parameter limit harus bilangan bulat positif' };
    }
    limit = Math.min(Number(query.limit), 1000);
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

// GET /api/reports/financial — Laporan Finansial & Laba Rugi (Khusus Owner)
const getFinancialReport = async (req, res) => {
  try {
    const { error, startDate, endDate } = resolveDateRange(req.query);
    if (error) return fail(res, 400, error);

    const data = await buildFinancialData(startDate, endDate);

    return res.status(200).json({
      success: true,
      message: 'Laporan finansial berhasil dikompilasi.',
      data,
    });
  } catch (err) {
    return handleControllerError(res, err, 'getFinancialReport');
  }
};

// GET /api/reports/stock-mutations — Laporan Persediaan & Kartu Mutasi Stok (Khusus Owner)
const getStockMutationsReport = async (req, res) => {
  try {
    const { error, startDate, endDate } = resolveDateRange(req.query);
    if (error) return fail(res, 400, error);

    const result = await buildStockMutationsData(req.query, startDate, endDate);
    if (result.error) return fail(res, 400, result.error);

    return res.status(200).json({
      success: true,
      message: 'Laporan persediaan dan kartu mutasi stok berhasil diambil.',
      data: result,
    });
  } catch (err) {
    return handleControllerError(res, err, 'getStockMutationsReport');
  }
};

// GET /api/reports/audit-trails — Penelusuran Log Jejak Audit (Khusus Owner)
const getAuditTrailsReport = async (req, res) => {
  try {
    const { error, startDate, endDate } = resolveDateRange(req.query);
    if (error) return fail(res, 400, error);

    const result = await buildAuditTrailsData(req.query, startDate, endDate);
    if (result.error) return fail(res, 400, result.error);

    return res.status(200).json({
      success: true,
      message: 'Log jejak audit aktivitas sistem berhasil diambil.',
      data: result,
    });
  } catch (err) {
    return handleControllerError(res, err, 'getAuditTrailsReport');
  }
};

// GET /api/reports/export — Ekspor Laporan ke PDF & Excel (Khusus Owner)
const exportReport = async (req, res) => {
  try {
    const type = String(req.query.type || '').trim().toLowerCase();
    const format = String(req.query.format || '').trim().toLowerCase();

    if (!VALID_EXPORT_TYPES.includes(type)) {
      return fail(
        res,
        400,
        "Parameter type wajib diisi ('financial', 'stock', atau 'audit')"
      );
    }
    if (!VALID_EXPORT_FORMATS.includes(format)) {
      return fail(res, 400, "Parameter format wajib diisi ('pdf' atau 'xlsx')");
    }

    const { error, startDate, endDate } = resolveDateRange(req.query);
    if (error) return fail(res, 400, error);

    const dateStr = endDate.replace(/-/g, '');

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistem Inventori & POS Toko Ban & Velg';
      workbook.created = new Date();

      if (type === 'financial') {
        const fin = await buildFinancialData(startDate, endDate);
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
      } else if (type === 'stock') {
        const stk = await buildStockMutationsData(req.query, startDate, endDate);
        if (stk.error) return fail(res, 400, stk.error);

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
      } else {
        const aud = await buildAuditTrailsData(req.query, startDate, endDate);
        if (aud.error) return fail(res, 400, aud.error);

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
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Laporan_${type}_${dateStr}.xlsx"`
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    // Format PDF menggunakan PDFKit
    let reportPayload;
    if (type === 'financial') {
      reportPayload = await buildFinancialData(startDate, endDate);
    } else if (type === 'stock') {
      reportPayload = await buildStockMutationsData(req.query, startDate, endDate);
      if (reportPayload.error) return fail(res, 400, reportPayload.error);
    } else {
      reportPayload = await buildAuditTrailsData(req.query, startDate, endDate);
      if (reportPayload.error) return fail(res, 400, reportPayload.error);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Laporan_${type}_${dateStr}.pdf"`
    );

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('TOKO BAN & VELG - LAPORAN SISTEM', { align: 'center' });

    const subtitleMap = {
      financial: 'LAPORAN FINANSIAL & PERHITUNGAN LABA RUGI',
      stock: 'LAPORAN PERSEDIAAN & KARTU MUTASI STOK',
      audit: 'LAPORAN LOG JEJAK AUDIT AKTIVITAS SISTEM',
    };

    doc
      .moveDown(0.3)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(subtitleMap[type], { align: 'center' });
    doc
      .moveDown(0.2)
      .font('Helvetica')
      .fontSize(9)
      .text(`Periode Laporan: ${startDate} s.d. ${endDate}`, { align: 'center' });

    doc.moveDown(1);

    if (type === 'financial') {
      const s = reportPayload.summary;
      doc.font('Helvetica-Bold').fontSize(11).text('1. Ringkasan Laba Rugi');
      doc.moveDown(0.4);

      const rows = [
        ['Total Omzet Penjualan (Lunas)', formatRupiahText(s.total_revenue)],
        ['Total Harga Pokok Penjualan (HPP)', formatRupiahText(s.total_cogs_hpp)],
        ['Laba Kotor (Gross Profit)', formatRupiahText(s.gross_profit)],
        [
          'Total Biaya Operasional',
          formatRupiahText(s.total_operational_expenses),
        ],
        [
          'Estimasi Laba Bersih (Net Profit)',
          formatRupiahText(s.net_estimated_profit),
        ],
        ['Total Transaksi Selesai', `${s.total_transactions} transaksi`],
        ['Total Unit Terjual', `${s.total_items_sold} unit`],
      ];

      rows.forEach(([label, val]) => {
        const y = doc.y;
        doc.font('Helvetica').fontSize(10).text(label, 45, y);
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(val, 320, y, { width: 225, align: 'right' });
        doc.moveDown(0.4);
      });

      doc.moveDown(0.6);
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('2. Rincian Biaya Operasional per Kategori', 40);
      doc.moveDown(0.4);

      if (reportPayload.expense_breakdown.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .text('Tidak ada catatan biaya operasional pada periode ini.', 45);
      } else {
        reportPayload.expense_breakdown.forEach((eb) => {
          const y = doc.y;
          doc
            .font('Helvetica')
            .fontSize(10)
            .text(EXPENSE_CATEGORY_LABELS[eb.category] || eb.category, 45, y);
          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(formatRupiahText(eb.total), 320, y, {
              width: 225,
              align: 'right',
            });
          doc.moveDown(0.35);
        });
      }

      doc.moveDown(0.6);
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('3. Transaksi Penjualan Terbaru (Lunas)', 40);
      doc.moveDown(0.4);

      if (reportPayload.recent_sales.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .text('Belum ada transaksi penjualan pada periode ini.', 45);
      } else {
        reportPayload.recent_sales.slice(0, 30).forEach((sale, idx) => {
          const dt = new Date(sale.transaction_date).toLocaleDateString('id-ID');
          doc
            .font('Helvetica')
            .fontSize(9)
            .text(
              `${idx + 1}. ${sale.invoice_code} | ${dt} | ${String(sale.payment_method).toUpperCase()} | Kasir: ${sale.cashier_name} | ${formatRupiahText(sale.grand_total)}`,
              45
            );
          doc.moveDown(0.25);
        });
      }
    } else if (type === 'stock') {
      const s = reportPayload.summary;
      doc.font('Helvetica-Bold').fontSize(11).text('1. Ringkasan Aset Persediaan');
      doc.moveDown(0.4);
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(
          `Total SKU: ${s.total_sku} produk | Total Unit Fisik: ${s.total_physical_units} unit | Nilai Aset: ${formatRupiahText(s.total_inventory_value)}`
        );
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(11).text('2. Riwayat Kartu Mutasi Stok');
      doc.moveDown(0.4);

      if (reportPayload.mutations.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .text('Tidak ada mutasi stok pada periode ini.');
      } else {
        reportPayload.mutations.slice(0, 50).forEach((m, idx) => {
          const dt = new Date(m.created_at).toLocaleString('id-ID');
          const sign = m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change;
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .text(
              `${idx + 1}. [${m.reference_code || '-'}] ${dt} | ${m.product_code} - ${m.product_name} (${m.ring_size}) | ${m.mutation_type} | Perubahan: ${sign} (Stok Akhir: ${m.stock_after})`,
              40
            );
          doc.moveDown(0.25);
        });
      }
    } else {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`Total Aktivitas Tercatat: ${reportPayload.total_records} log`);
      doc.moveDown(0.5);

      if (reportPayload.logs.length === 0) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .text('Tidak ada log aktivitas pada periode ini.');
      } else {
        reportPayload.logs.slice(0, 50).forEach((log, idx) => {
          const dt = new Date(log.created_at).toLocaleString('id-ID');
          doc
            .font('Helvetica')
            .fontSize(8.5)
            .text(
              `${idx + 1}. ${dt} | ${log.user_name || 'System'} (${log.user_role || '-'}) | ${log.action} | ${log.description || '-'}`,
              40
            );
          doc.moveDown(0.25);
        });
      }
    }

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      return handleControllerError(res, err, 'exportReport', {
        defaultMessage: 'Terjadi kesalahan internal server saat mengekspor laporan',
      });
    }
    console.error('Kesalahan exportReport:', err);
  }
};

module.exports = {
  getFinancialReport,
  getStockMutationsReport,
  getAuditTrailsReport,
  exportReport,
};
