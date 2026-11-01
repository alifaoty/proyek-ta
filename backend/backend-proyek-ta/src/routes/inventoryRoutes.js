const express = require('express');
const { createInbound, createOutbound, getMutations } = require('../controllers/inventoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Seluruh rute wajib login dan hanya untuk peran admin & owner
router.use(authMiddleware, roleMiddleware(['admin', 'owner']));

router.post('/inventory/inbound', createInbound);
router.post('/inventory/outbound', createOutbound);
router.get('/inventory/mutations', getMutations);

module.exports = router;

