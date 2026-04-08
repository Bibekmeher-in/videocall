const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: {
        type: Date,
        default: null
    }
});

const callSchema = new mongoose.Schema({
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    calleeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        default: null
    },
    callType: {
        type: String,
        enum: ['audio', 'video'],
        required: true
    },
    callStatus: {
        type: String,
        enum: ['initiated', 'ringing', 'accepted', 'rejected', 'ended', 'missed', 'busy'],
        default: 'initiated'
    },
    participants: [participantSchema],
    startTime: {
        type: Date,
        default: null
    },
    endTime: {
        type: Date,
        default: null
    },
    duration: {
        type: Number,
        default: 0 // in seconds
    },
    isGroupCall: {
        type: Boolean,
        default: false
    },
    roomId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ calleeId: 1, createdAt: -1 });
callSchema.index({ roomId: 1 });

// Calculate duration before saving
callSchema.pre('save', function (next) {
    if (this.startTime && this.endTime) {
        this.duration = Math.floor((this.endTime - this.startTime) / 1000);
    }
    next();
});

module.exports = mongoose.model('Call', callSchema);
