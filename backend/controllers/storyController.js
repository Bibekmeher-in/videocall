const Story = require('../models/Story');
const User = require('../models/User');

// @desc    Get all active stories
// @route   GET /api/stories
// @access  Private
const getStories = async (req, res) => {
    try {
        const stories = await Story.find({
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
            .populate('userId', 'name avatar status')
            .sort({ createdAt: -1 });

        // Group stories by user
        const storiesByUser = stories.reduce((acc, story) => {
            const userId = story.userId._id.toString();
            if (!acc[userId]) {
                acc[userId] = {
                    user: story.userId,
                    stories: []
                };
            }
            acc[userId].stories.push(story);
            return acc;
        }, {});

        res.json(Object.values(storiesByUser));
    } catch (error) {
        console.error('Get stories error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's stories
// @route   GET /api/stories/:userId
// @access  Private
const getUserStories = async (req, res) => {
    try {
        const stories = await Story.find({
            userId: req.params.userId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
            .populate('userId', 'name avatar status')
            .sort({ createdAt: -1 });

        res.json(stories);
    } catch (error) {
        console.error('Get user stories error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create story
// @route   POST /api/stories
// @access  Private
const createStory = async (req, res) => {
    try {
        const { mediaUrl, mediaType, thumbnail, caption, duration } = req.body;

        // Stories expire after 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const story = await Story.create({
            userId: req.user._id,
            mediaUrl,
            mediaType,
            thumbnail: thumbnail || '',
            caption: caption || '',
            duration: duration || 0,
            expiresAt
        });

        const populatedStory = await Story.findById(story._id)
            .populate('userId', 'name avatar status');

        res.status(201).json(populatedStory);
    } catch (error) {
        console.error('Create story error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    View story
// @route   POST /api/stories/:storyId/view
// @access  Private
const viewStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId);

        if (!story) {
            return res.status(404).json({ message: 'Story not found' });
        }

        // Check if already viewed
        if (!story.viewers.includes(req.user._id)) {
            story.viewers.push(req.user._id);
            story.viewCount += 1;
            await story.save();
        }

        res.json({ message: 'Story viewed' });
    } catch (error) {
        console.error('View story error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete story
// @route   DELETE /api/stories/:storyId
// @access  Private
const deleteStory = async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId);

        if (!story) {
            return res.status(404).json({ message: 'Story not found' });
        }

        // Only owner can delete
        if (story.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this story' });
        }

        story.isActive = false;
        await story.save();

        res.json({ message: 'Story deleted' });
    } catch (error) {
        console.error('Delete story error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get story viewers
// @route   GET /api/stories/:storyId/viewers
// @access  Private
const getStoryViewers = async (req, res) => {
    try {
        const story = await Story.findById(req.params.storyId)
            .populate('viewers', 'name avatar');

        if (!story) {
            return res.status(404).json({ message: 'Story not found' });
        }

        // Only owner can see viewers
        if (story.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view viewers' });
        }

        res.json(story.viewers);
    } catch (error) {
        console.error('Get story viewers error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStories,
    getUserStories,
    createStory,
    viewStory,
    deleteStory,
    getStoryViewers
};
