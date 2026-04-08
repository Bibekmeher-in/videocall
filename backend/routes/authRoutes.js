const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    getUsers,
    getUserById,
    searchUsers,
    addContact,
    getContacts
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.get('/users', protect, getUsers);
router.get('/users/:id', protect, getUserById);
router.get('/search', protect, searchUsers);
router.post('/contacts/:userId', protect, addContact);
router.get('/contacts', protect, getContacts);

module.exports = router;
