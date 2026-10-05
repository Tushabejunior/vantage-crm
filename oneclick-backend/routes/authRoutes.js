const express = require('express');
const router = express.Router();
const { getSetupStatus, createAdmin, addViewer, login, listUsers } = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/setup-status', getSetupStatus);
router.post('/create-admin', createAdmin);
router.post('/login', login);
router.get('/users', listUsers);
router.post('/add-viewer', verifyToken, requireAdmin, addViewer);

module.exports = router;