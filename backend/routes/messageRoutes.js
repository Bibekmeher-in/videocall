const express = require('express');
const router = express.Router();
const {
    getMessages,
    sendMessage,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    getConversations,
    addReaction
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations', protect, getConversations);
router.get('/:contactId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/:messageId/read', protect, markAsRead);
router.put('/:contactId/read-all', protect, markAllAsRead);
router.delete('/:messageId', protect, deleteMessage);
router.put('/:messageId/reaction', protect, addReaction);

module.exports = router;
