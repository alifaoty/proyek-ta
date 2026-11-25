const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Seluruh rute inventori wajib melewati autentikasi JWT
router.use(authMiddleware);

// Path relatif: prefix /api/inventory dipasang di server.js
router.post('/inbound', roleMiddleware(['admin', 'owner']), inventoryController.createInbound);
router.post('/outbound', roleMiddleware(['admin', 'owner']), inventoryController.createOutbound);
router.get('/mutations', roleMiddleware(['owner']), inventoryController.getMutations);

module.exports = router;
