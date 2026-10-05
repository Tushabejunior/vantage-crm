const express = require('express');
const router = express.Router();
const { getOpportunities } = require('../controllers/opportunityController');

router.get('/', getOpportunities);

module.exports = router;