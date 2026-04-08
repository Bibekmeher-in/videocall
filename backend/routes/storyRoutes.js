const express = require('express');
const router = express.Router();
const {
  getStories,
  getUserStories,
  createStory,
  viewStory,
  deleteStory,
  getStoryViewers
} = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getStories);
router.get('/:userId', protect, getUserStories);
router.post('/', protect, createStory);
router.post('/:storyId/view', protect, viewStory);
router.delete('/:storyId', protect, deleteStory);
router.get('/:storyId/viewers', protect, getStoryViewers);

module.exports = router;
