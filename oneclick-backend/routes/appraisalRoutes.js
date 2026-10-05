const express = require('express');
const router = express.Router();
const { getAllAppraisals, saveAppraisal, deleteAppraisal } = require('../controllers/appraisalController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', getAllAppraisals);
router.post('/', verifyToken, requireAdmin, saveAppraisal);
router.delete('/:id', verifyToken, requireAdmin, deleteAppraisal);

module.exports = router;