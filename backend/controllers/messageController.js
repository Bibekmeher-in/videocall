const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get messages between two users
// @route   GET /api/messages/:contactId
// @access  Private
const getMessages = async (req, res) => {
    try {
        const contactId = req.params.contactId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await Message.find({
            $or: [
                { senderId: req.user._id, receiverId: contactId },
                { senderId: contactId, receiverId: req.user._id }
            ]
        })
            .populate('senderId', 'name avatar')
            .populate('receiverId', 'name avatar')
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Mark messages as seen
        await Message.updateMany(
            { senderId: contactId, receiverId: req.user._id, seen: false },
            { seen: true }
        );

        // Update user's last seen
        await User.findByIdAndUpdate(contactId, { lastSeen: new Date() });

        res.json(messages.reverse());
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { receiverId, content, messageType, fileUrl, fileName, fileSize, mimeType, thumbnail } = req.body;

        const message = await Message.create({
            senderId: req.user._id,
            receiverId,
            messageType: messageType || 'text',
            content: content || '',
            fileUrl: fileUrl || '',
            fileName: fileName || '',
            fileSize: fileSize || 0,
            mimeType: mimeType || '',
            thumbnail: thumbnail || ''
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name avatar')
            .populate('receiverId', 'name avatar');

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:messageId/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        message.seen = true;
        await message.save();

        res.json(message);
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark all messages as read with a contact
// @route   PUT /api/messages/:contactId/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
    try {
        await Message.updateMany(
            {
                senderId: req.params.contactId,
                receiverId: req.user._id,
                seen: false
            },
            { seen: true }
        );

        res.json({ message: 'All messages marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete message
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Only sender can delete
        if (message.senderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this message' });
        }

        await message.deleteOne();
        res.json({ message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get last message with each contact
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get all contacts
        const user = await User.findById(userId);
        const contacts = user.contacts;

        const conversations = [];

        for (const contactId of contacts) {
            const lastMessage = await Message.findOne({
                $or: [
                    { senderId: userId, receiverId: contactId },
                    { senderId: contactId, receiverId: userId }
                ]
            })
                .sort({ timestamp: -1 })
                .populate('senderId', 'name avatar')
                .populate('receiverId', 'name avatar');

            const unreadCount = await Message.countDocuments({
                senderId: contactId,
                receiverId: userId,
                seen: false
            });

            const contact = await User.findById(contactId).select('name avatar status lastSeen');

            if (contact || lastMessage) {
                conversations.push({
                    contact: contact || lastMessage?.senderId || lastMessage?.receiverId,
                    lastMessage,
                    unreadCount
                });
            }
        }

        // Sort by last message timestamp
        conversations.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
        });

        res.json(conversations);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add reaction to message
// @route   PUT /api/messages/:messageId/reaction
// @access  Private
const addReaction = async (req, res) => {
    try {
        const { emoji } = req.body;
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Check if user already reacted
        const existingReaction = message.reactions.find(
            r => r.userId.toString() === req.user._id.toString()
        );

        if (existingReaction) {
            existingReaction.emoji = emoji;
        } else {
            message.reactions.push({ userId: req.user._id, emoji });
        }

        await message.save();
        res.json(message);
    } catch (error) {
        console.error('Add reaction error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getMessages,
    sendMessage,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    getConversations,
    addReaction
};
