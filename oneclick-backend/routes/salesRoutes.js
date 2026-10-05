const express = require('express');
const router = express.Router();
const { getAllSales, createSale, updateSale, deleteSale } = require('../controllers/salesController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', getAllSales); // anyone logged in can view — we'll add verifyToken here too once frontend sends tokens
router.post('/', verifyToken, requireAdmin, createSale);
router.put('/:id', verifyToken, requireAdmin, updateSale);
router.delete('/:id', verifyToken, requireAdmin, deleteSale);

module.exports = router;