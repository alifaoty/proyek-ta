const PDFDocument = require('pdfkit');
const { formatRupiahText } = require('../utils/formatters');
const { EXPENSE_CATEGORY_LABELS } = require('./reportDataService');

const createPdfDocumentHeader = (res, subtitle, startDate, endDate) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .text('TOKO BAN & VELG - LAPORAN SISTEM', { align: 'center' });

  doc
    .moveDown(0.3)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(subtitle, { align: 'center' });

  doc
    .moveDown(0.2)
    .font('Helvetica')
    .fontSize(9)
    .text(`Periode Laporan: ${startDate} s.d. ${endDate}`, { align: 'center' });

  doc.moveDown(1);
  return doc;
};

/**
 * Merender dokumen PDF laporan finansial & perhitungan laba rugi ke stream res.
 */
const renderFinancialPdf = (res, reportPayload, range = {}) => {
  const startDate = range.startDate || reportPayload.period?.start_date;
  const endDate = range.endDate || reportPayload.period?.end_date;

  const doc = createPdfDocumentHeader(
    res,
    'LAPORAN FINANSIAL & PERHITUNGAN LABA RUGI',
    startDate,
    endDate
  );

  const s = reportPayload.summary;
  doc.font('Helvetica-Bold').fontSize(11).text('1. Ringkasan Laba Rugi');
  doc.moveDown(0.4);

  const rows = [
    ['Total Omzet Penjualan (Lunas)', formatRupiahText(s.total_revenue)],
    ['Total Harga Pokok Penjualan (HPP)', formatRupiahText(s.total_cogs_hpp)],
    ['Laba Kotor (Gross Profit)', formatRupiahText(s.gross_profit)],
    ['Total Biaya Operasional', formatRupiahText(s.total_operational_expenses)],
    ['Estimasi Laba Bersih (Net Profit)', formatRupiahText(s.net_estimated_profit)],
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

  doc.end();
};

/**
 * Merender dokumen PDF laporan persediaan & kartu mutasi stok ke stream res.
 */
const renderStockPdf = (res, reportPayload, range = {}) => {
  const startDate = range.startDate || reportPayload.period?.start_date;
  const endDate = range.endDate || reportPayload.period?.end_date;

  const doc = createPdfDocumentHeader(
    res,
    'LAPORAN PERSEDIAAN & KARTU MUTASI STOK',
    startDate,
    endDate
  );

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

  doc.end();
};

/**
 * Merender dokumen PDF laporan log jejak audit ke stream res.
 */
const renderAuditPdf = (res, reportPayload, range = {}) => {
  const startDate = range.startDate || reportPayload.period?.start_date;
  const endDate = range.endDate || reportPayload.period?.end_date;

  const doc = createPdfDocumentHeader(
    res,
    'LAPORAN LOG JEJAK AUDIT AKTIVITAS SISTEM',
    startDate,
    endDate
  );

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

  doc.end();
};

module.exports = {
  renderFinancialPdf,
  renderStockPdf,
  renderAuditPdf,
};
