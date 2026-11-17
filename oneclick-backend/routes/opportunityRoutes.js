const { verifyToken } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const { getOpportunities } = require('../controllers/opportunityController');

router.get('/', verifyToken, getOpportunities);

module.exports = router;