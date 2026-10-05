const express = require('express');
const router = express.Router();
const { generateReport } = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');

router.get('/:period', verifyToken, generateReport);

module.exports = router;