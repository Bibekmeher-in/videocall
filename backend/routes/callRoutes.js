const express = require('express');
const router = express.Router();
const {
    initiateCall,
    getCallByRoomId,
    updateCallStatus,
    endCall,
    getCallHistory,
    joinCall,
    leaveCall
} = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, initiateCall);
router.get('/room/:roomId', protect, getCallByRoomId);
router.get('/history', protect, getCallHistory);
router.put('/:callId', protect, updateCallStatus);
router.put('/:callId/end', protect, endCall);
router.post('/:callId/join', protect, joinCall);
router.post('/:callId/leave', protect, leaveCall);

module.exports = router;
