const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Seluruh rute wajib login dan hanya untuk peran admin & owner
router.use(authMiddleware, roleMiddleware(['admin', 'owner']));

// Path relatif: prefix /api/inventory dipasang di server.js
router.post('/inbound', inventoryController.createInbound);
router.post('/outbound', inventoryController.createOutbound);
router.get('/mutations', inventoryController.getMutations);

module.exports = router;