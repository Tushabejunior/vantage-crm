const express = require('express');
const router = express.Router();
const { getAllClients, updateClientSector } = require('../controllers/clientController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', getAllClients);
router.put('/:id/sector', verifyToken, requireAdmin, updateClientSector);

module.exports = router;