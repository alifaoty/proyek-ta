const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Seluruh rute laporan finansial, mutasi stok, audit trail & ekspor eksklusif untuk Owner
router.use(authMiddleware);
router.use(roleMiddleware(['owner']));

router.get('/financial', reportController.getFinancialReport);
router.get('/stock-mutations', reportController.getStockMutationsReport);
router.get('/audit-trails', reportController.getAuditTrailsReport);
router.get('/export', reportController.exportReport);

module.exports = router;
