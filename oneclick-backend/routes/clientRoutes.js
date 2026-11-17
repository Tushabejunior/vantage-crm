const express = require('express');
const router = express.Router();
const {
  getAllClients, createClient, updateClient, updateClientSector, deleteClient,
} = require('../controllers/clientController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', verifyToken, getAllClients);
router.post('/', verifyToken, requireAdmin, createClient);
router.put('/:id', verifyToken, requireAdmin, updateClient);
router.put('/:id/sector', verifyToken, requireAdmin, updateClientSector);
router.delete('/:id', verifyToken, requireAdmin, deleteClient);

module.exports = router;