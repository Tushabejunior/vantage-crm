const express = require('express');
const router = express.Router();
const {
  getAllActivities, createActivity, updateActivity, deleteActivity,
} = require('../controllers/activityController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', verifyToken, getAllActivities);
router.post('/', verifyToken, requireAdmin, createActivity);
router.put('/:id', verifyToken, requireAdmin, updateActivity);
router.delete('/:id', verifyToken, requireAdmin, deleteActivity);

module.exports = router;