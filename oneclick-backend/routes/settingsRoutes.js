const express = require('express');
const router = express.Router();
const { getSettings, updateSetting } = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', getSettings);
router.put('/:key', verifyToken, requireAdmin, updateSetting);

module.exports = router;