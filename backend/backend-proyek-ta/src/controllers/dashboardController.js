const dashboardService = require('../services/dashboardService');
const { handleControllerError } = require('../utils/httpHelper');

// GET /api/dashboard/owner-summary — Ringkasan Eksekutif Dashboard Owner (Khusus Owner)
const getOwnerSummary = async (req, res) => {
  try {
    const data = await dashboardService.getOwnerDashboardSummary();

    return res.status(200).json({
      success: true,
      message: 'Ringkasan dashboard owner berhasil dimuat',
      data,
    });
  } catch (error) {
    return handleControllerError(res, error, 'getOwnerSummary');
  }
};

module.exports = {
  getOwnerSummary,
};
