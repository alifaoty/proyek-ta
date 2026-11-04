const express = require('express');
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Seluruh rute transaksi kasir wajib login dan hanya untuk peran admin & owner
router.use(authMiddleware, roleMiddleware(['admin', 'owner']));

router.post('/', transactionController.createCashTransaction);
router.post('/charge-qris', transactionController.createQrisTransaction);
router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);

module.exports = router;

