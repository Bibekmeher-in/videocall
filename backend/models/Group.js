const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'moderator', 'member'],
        default: 'member'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    mutedUntil: {
        type: Date,
        default: null
    }
});

const groupSchema = new mongoose.Schema({
    groupName: {
        type: String,
        required: [true, 'Group name is required'],
        trim: true,
        minlength: [2, 'Group name must be at least 2 characters'],
        maxlength: [100, 'Group name cannot exceed 100 characters']
    },
    groupAvatar: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
        default: ''
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [memberSchema],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Virtual for member count
groupSchema.virtual('memberCount').get(function () {
    return this.members.length;
});

// Method to check if user is admin
groupSchema.methods.isAdmin = function (userId) {
    return this.admin.toString() === userId.toString();
};

// Method to check if user is member
groupSchema.methods.isMember = function (userId) {
    return this.members.some(member => member.userId.toString() === userId.toString());
};

module.exports = mongoose.model('Group', groupSchema);
