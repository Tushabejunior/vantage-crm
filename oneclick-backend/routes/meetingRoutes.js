const express = require('express');
const router = express.Router();
const {
  getAllMeetings, createMeeting, updateMeeting, updateMeetingStatus, deleteMeeting
} = require('../controllers/meetingController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.get('/', verifyToken, getAllMeetings);
router.post('/', verifyToken, requireAdmin, createMeeting);
router.put('/:id', verifyToken, requireAdmin, updateMeeting);
router.patch('/:id/status', verifyToken, requireAdmin, updateMeetingStatus);
router.delete('/:id', verifyToken, requireAdmin, deleteMeeting);

module.exports = router;