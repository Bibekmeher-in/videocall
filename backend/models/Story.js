const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mediaUrl: {
        type: String,
        required: [true, 'Media URL is required']
    },
    mediaType: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    thumbnail: {
        type: String,
        default: ''
    },
    duration: {
        type: Number,
        default: 0 // seconds, for videos
    },
    caption: {
        type: String,
        maxlength: [150, 'Caption cannot exceed 150 characters'],
        default: ''
    },
    viewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    viewCount: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Set expiration to 24 hours from creation
storySchema.pre('save', function (next) {
    if (this.isNew) {
        this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    next();
});

// Static method to get active stories
storySchema.statics.getActiveStories = function () {
    return this.find({
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).populate('userId', 'name avatar status').sort({ createdAt: -1 });
};

module.exports = mongoose.model('Story', storySchema);
