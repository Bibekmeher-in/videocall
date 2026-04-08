const Call = require('../models/Call');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// @desc    Initiate a call
// @route   POST /api/calls
// @access  Private
const initiateCall = async (req, res) => {
    try {
        const { calleeId, callType, isGroupCall, groupId } = req.body;

        const roomId = uuidv4();

        const call = await Call.create({
            callerId: req.user._id,
            calleeId: calleeId || null,
            groupId: groupId || null,
            callType: callType || 'video',
            callStatus: 'initiated',
            isGroupCall: isGroupCall || false,
            roomId,
            participants: [{ userId: req.user._id }]
        });

        const populatedCall = await Call.findById(call._id)
            .populate('callerId', 'name avatar')
            .populate('calleeId', 'name avatar')
            .populate('participants.userId', 'name avatar');

        res.status(201).json(populatedCall);
    } catch (error) {
        console.error('Initiate call error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get call by room ID
// @route   GET /api/calls/room/:roomId
// @access  Private
const getCallByRoomId = async (req, res) => {
    try {
        const call = await Call.findOne({ roomId: req.params.roomId })
            .populate('callerId', 'name avatar')
            .populate('calleeId', 'name avatar')
            .populate('participants.userId', 'name avatar');

        if (!call) {
            return res.status(404).json({ message: 'Call not found' });
        }

        res.json(call);
    } catch (error) {
        console.error('Get call error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update call status
// @route   PUT /api/calls/:callId
// @access  Private
const updateCallStatus = async (req, res) => {
    try {
        const { callStatus, startTime, endTime } = req.body;

        const call = await Call.findById(req.params.callId);

        if (!call) {
            return res.status(404).json({ message: 'Call not found' });
        }

        if (callStatus) call.callStatus = callStatus;
        if (startTime) call.startTime = startTime;
        if (endTime) call.endTime = endTime;

        await call.save();

        const populatedCall = await Call.findById(call._id)
            .populate('callerId', 'name avatar')
            .populate('calleeId', 'name avatar')
            .populate('participants.userId', 'name avatar');

        res.json(populatedCall);
    } catch (error) {
        console.error('Update call status error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    End call
// @route   PUT /api/calls/:callId/end
// @access  Private
const endCall = async (req, res) => {
    try {
        const call = await Call.findById(req.params.callId);

        if (!call) {
            return res.status(404).json({ message: 'Call not found' });
        }

        call.callStatus = 'ended';
        call.endTime = new Date();

        if (call.startTime) {
            call.duration = Math.floor((call.endTime - call.startTime) / 1000);
        }

        await call.save();

        const populatedCall = await Call.findById(call._id)
            .populate('callerId', 'name avatar')
            .populate('calleeId', 'name avatar')
            .populate('participants.userId', 'name avatar');

        res.json(populatedCall);
    } catch (error) {
        console.error('End call error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get call history
// @route   GET /api/calls/history
// @access  Private
const getCallHistory = async (req, res) => {
    try {
        const calls = await Call.find({
            $or: [
                { callerId: req.user._id },
                { calleeId: req.user._id },
                { 'participants.userId': req.user._id }
            ]
        })
            .populate('callerId', 'name avatar')
            .populate('calleeId', 'name avatar')
            .populate('groupId', 'groupName')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(calls);
    } catch (error) {
        console.error('Get call history error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Join call
// @route   POST /api/calls/:callId/join
// @access  Private
const joinCall = async (req, res) => {
    try {
        const call = await Call.findById(req.params.callId);

        if (!call) {
            return res.status(404).json({ message: 'Call not found' });
        }

        // Check if already a participant
        const isParticipant = call.participants.some(
            p => p.userId.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            call.participants.push({ userId: req.user._id });
        }

        // Start call if not started
        if (!call.startTime && call.callStatus === 'initiated') {
            call.callStatus = 'accepted';
            call.startTime = new Date();
        }

        await call.save();

        const populatedCall = await Call.findById(call._id)
            .populate('callerId', 'name avatar')
            .populate('calleeId', 'name avatar')
            .populate('participants.userId', 'name avatar');

        res.json(populatedCall);
    } catch (error) {
        console.error('Join call error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Leave call
// @route   POST /api/calls/:callId/leave
// @access  Private
const leaveCall = async (req, res) => {
    try {
        const call = await Call.findById(req.params.callId);

        if (!call) {
            return res.status(404).json({ message: 'Call not found' });
        }

        const participant = call.participants.find(
            p => p.userId.toString() === req.user._id.toString()
        );

        if (participant) {
            participant.leftAt = new Date();
        }

        await call.save();

        res.json({ message: 'Left call' });
    } catch (error) {
        console.error('Leave call error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    initiateCall,
    getCallByRoomId,
    updateCallStatus,
    endCall,
    getCallHistory,
    joinCall,
    leaveCall
};
