const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Seluruh rute dashboard eksekutif wajib melewati autentikasi JWT dan eksklusif untuk Owner
router.use(authMiddleware);
router.use(roleMiddleware(['owner']));

router.get('/owner-summary', dashboardController.getOwnerSummary);

module.exports = router;
