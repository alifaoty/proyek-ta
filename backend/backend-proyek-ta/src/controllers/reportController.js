const {
  fetchAuditTrailsReportData,
  fetchFinancialReportData,
  fetchStockMutationsReportData,
} = require('../services/reportDataService');
const {
  buildAuditExcel,
  buildFinancialExcel,
  buildStockExcel,
} = require('../services/reportExcelService');
const {
  renderAuditPdf,
  renderFinancialPdf,
  renderStockPdf,
} = require('../services/reportPdfService');
const { fail, handleControllerError } = require('../utils/httpHelper');
const { resolveDateRange } = require('../utils/validators');

const VALID_EXPORT_TYPES = ['financial', 'stock', 'audit'];
const VALID_EXPORT_FORMATS = ['pdf', 'xlsx'];

// GET /api/reports/financial — Laporan Finansial & Laba Rugi (Khusus Owner)
const getFinancialReport = async (req, res) => {
  try {
    const { error, startDate, endDate } = resolveDateRange(req.query);
    if (error) return fail(res, 400, error);

    const data = await fetchFinancialReportData(startDate, endDate);

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

    const result = await fetchStockMutationsReportData(req.query, startDate, endDate);
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

    const result = await fetchAuditTrailsReportData(req.query, startDate, endDate);
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

    let reportPayload;
    if (type === 'financial') {
      reportPayload = await fetchFinancialReportData(startDate, endDate);
    } else if (type === 'stock') {
      reportPayload = await fetchStockMutationsReportData(req.query, startDate, endDate);
    } else {
      reportPayload = await fetchAuditTrailsReportData(req.query, startDate, endDate);
    }

    if (reportPayload.error) {
      return fail(res, 400, reportPayload.error);
    }

    const dateStr = endDate.replace(/-/g, '');
    const range = { startDate, endDate };

    if (format === 'xlsx') {
      let workbook;
      if (type === 'financial') {
        workbook = buildFinancialExcel(reportPayload, range);
      } else if (type === 'stock') {
        workbook = buildStockExcel(reportPayload, range);
      } else {
        workbook = buildAuditExcel(reportPayload, range);
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
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Laporan_${type}_${dateStr}.pdf"`
    );

    if (type === 'financial') {
      renderFinancialPdf(res, reportPayload, range);
    } else if (type === 'stock') {
      renderStockPdf(res, reportPayload, range);
    } else {
      renderAuditPdf(res, reportPayload, range);
    }
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
