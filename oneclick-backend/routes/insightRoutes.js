const express = require('express');
const router = express.Router();
const { generateInsights } = require('../controllers/insightController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.post('/generate', verifyToken, requireAdmin, generateInsights);

module.exports = router;