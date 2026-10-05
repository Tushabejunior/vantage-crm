const express = require('express');
const router = express.Router();
const { getAllTargets, updateTarget } = require('../controllers/targetController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', getAllTargets);
router.put('/:key', verifyToken, requireAdmin, updateTarget);

module.exports = router;