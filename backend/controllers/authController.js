const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'default-secret', {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedName = name?.trim();
        const normalizedEmail = email?.trim().toLowerCase();

        if (!normalizedName || !normalizedEmail || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create user
        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                token: generateToken(user._id)
            });
        }
    } catch (error) {
        console.error('Register error:', error);

        if (error.name === 'ValidationError') {
            const firstValidationError = Object.values(error.errors || {})[0]?.message;
            return res.status(400).json({ message: firstValidationError || 'Invalid registration data' });
        }

        if (error.code === 11000) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        res.status(500).json({ message: 'Internal server error during registration' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Update status
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            status: user.status,
            contacts: user.contacts,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { name, bio, avatar } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (bio !== undefined) user.bio = bio;
        if (avatar) user.avatar = avatar;

        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            status: user.status
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private
const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } })
            .select('-password')
            .sort({ name: 1 });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/auth/users/:id
// @access  Private
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search users
// @route   GET /api/auth/search
// @access  Private
const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Search query required' });
        }

        const users = await User.find({
            $and: [
                { _id: { $ne: req.user._id } },
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        }).select('-password').limit(20);

        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add contact
// @route   POST /api/auth/contacts/:userId
// @access  Private
const addContact = async (req, res) => {
    try {
        const userId = req.params.userId;

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot add yourself as contact' });
        }

        const user = await User.findById(req.user._id);
        const contactToAdd = await User.findById(userId);

        if (!contactToAdd) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.contacts.includes(userId)) {
            return res.status(400).json({ message: 'User already in contacts' });
        }

        user.contacts.push(userId);
        await user.save();

        // Also add user to contact's contacts
        if (!contactToAdd.contacts.includes(req.user._id)) {
            contactToAdd.contacts.push(req.user._id);
            await contactToAdd.save();
        }

        res.json({ message: 'Contact added successfully' });
    } catch (error) {
        console.error('Add contact error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user contacts
// @route   GET /api/auth/contacts
// @access  Private
const getContacts = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('contacts', 'name email avatar bio status lastSeen');
        res.json(user.contacts);
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
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
};
