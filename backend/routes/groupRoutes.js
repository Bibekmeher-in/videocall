const express = require('express');
const router = express.Router();
const {
  getGroups,
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMember,
  makeAdmin,
  getGroupMessages,
  sendGroupMessage
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getGroups);
router.post('/', protect, createGroup);
router.get('/:groupId', protect, getGroupById);
router.put('/:groupId', protect, updateGroup);
router.delete('/:groupId', protect, deleteGroup);
router.post('/:groupId/members', protect, addMembers);
router.delete('/:groupId/members/:userId', protect, removeMember);
router.put('/:groupId/admin/:userId', protect, makeAdmin);
router.get('/:groupId/messages', protect, getGroupMessages);
router.post('/:groupId/messages', protect, sendGroupMessage);

module.exports = router;
