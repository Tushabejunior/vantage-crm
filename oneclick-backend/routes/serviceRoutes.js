const express = require('express');
const router = express.Router();
const { getAllServices, createService, updateService, deleteService } = require('../controllers/serviceController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', getAllServices);
router.post('/', verifyToken, requireAdmin, createService);
router.put('/:id', verifyToken, requireAdmin, updateService);
router.delete('/:id', verifyToken, requireAdmin, deleteService);

module.exports = router;