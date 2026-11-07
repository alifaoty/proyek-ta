const express = require('express');
const stockOpnameController = require('../controllers/stockOpnameController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Seluruh rute stock opname wajib melewati autentikasi JWT
router.use(authMiddleware);

router.post('/', roleMiddleware(['admin', 'owner']), stockOpnameController.createOpname);
router.get('/', roleMiddleware(['admin', 'owner']), stockOpnameController.getOpnames);
router.get('/:id', roleMiddleware(['admin', 'owner']), stockOpnameController.getOpnameById);
router.patch('/:id/approve', roleMiddleware(['owner']), stockOpnameController.approveOpname);
router.patch('/:id/reject', roleMiddleware(['owner']), stockOpnameController.rejectOpname);

module.exports = router;