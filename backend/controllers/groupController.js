const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
    try {
        const groups = await Group.find({
            'members.userId': req.user._id
        })
            .populate('admin', 'name avatar')
            .populate('members.userId', 'name avatar status')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        res.json(groups);
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
    try {
        const { groupName, groupAvatar, description, memberIds } = req.body;

        const members = [
            { userId: req.user._id, role: 'admin' }
        ];

        if (memberIds && Array.isArray(memberIds)) {
            for (const userId of memberIds) {
                members.push({ userId, role: 'member' });
            }
        }

        const group = await Group.create({
            groupName,
            groupAvatar: groupAvatar || '',
            description: description || '',
            admin: req.user._id,
            members
        });

        const populatedGroup = await Group.findById(group._id)
            .populate('admin', 'name avatar')
            .populate('members.userId', 'name avatar status');

        res.status(201).json(populatedGroup);
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get group by ID
// @route   GET /api/groups/:groupId
// @access  Private
const getGroupById = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId)
            .populate('admin', 'name avatar')
            .populate('members.userId', 'name avatar status email');

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isMember = group.members.some(
            m => m.userId._id.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not a member of this group' });
        }

        res.json(group);
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update group
// @route   PUT /api/groups/:groupId
// @access  Private
const updateGroup = async (req, res) => {
    try {
        const { groupName, groupAvatar, description } = req.body;

        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can update group' });
        }

        if (groupName) group.groupName = groupName;
        if (groupAvatar !== undefined) group.groupAvatar = groupAvatar;
        if (description !== undefined) group.description = description;

        await group.save();

        const updatedGroup = await Group.findById(group._id)
            .populate('admin', 'name avatar')
            .populate('members.userId', 'name avatar status');

        res.json(updatedGroup);
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete group
// @route   DELETE /api/groups/:groupId
// @access  Private
const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can delete group' });
        }

        await group.deleteOne();
        res.json({ message: 'Group deleted' });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add members to group
// @route   POST /api/groups/:groupId/members
// @access  Private
const addMembers = async (req, res) => {
    try {
        const { memberIds } = req.body;

        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const userMember = group.members.find(
            m => m.userId.toString() === req.user._id.toString()
        );

        if (!userMember || (userMember.role !== 'admin' && userMember.role !== 'moderator')) {
            return res.status(403).json({ message: 'Not authorized to add members' });
        }

        for (const userId of memberIds) {
            const exists = group.members.some(m => m.userId.toString() === userId);
            if (!exists) {
                group.members.push({ userId, role: 'member' });
            }
        }

        await group.save();

        const updatedGroup = await Group.findById(group._id)
            .populate('admin', 'name avatar')
            .populate('members.userId', 'name avatar status');

        res.json(updatedGroup);
    } catch (error) {
        console.error('Add members error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove member from group
// @route   DELETE /api/groups/:groupId/members/:userId
// @access  Private
const removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isAdmin = group.admin.toString() === req.user._id.toString();
        const isSelf = req.params.userId === req.user._id.toString();

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ message: 'Not authorized to remove members' });
        }

        if (req.params.userId === group.admin.toString()) {
            return res.status(400).json({ message: 'Cannot remove admin' });
        }

        group.members = group.members.filter(
            m => m.userId.toString() !== req.params.userId
        );

        await group.save();

        const updatedGroup = await Group.findById(group._id)
            .populate('admin', 'name avatar')
            .populate('members.userId', 'name avatar status');

        res.json(updatedGroup);
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Make member admin
// @route   PUT /api/groups/:groupId/admin/:userId
// @access  Private
const makeAdmin = async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only admin can assign new admins' });
        }

        const member = group.members.find(
            m => m.userId.toString() === req.params.userId
        );

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        member.role = 'admin';
        await group.save();

        const updatedGroup = await Group.findById(group._id)
            .populate('admin', 'name avatar')
            .populate('members.userId', 'name avatar status');

        res.json(updatedGroup);
    } catch (error) {
        console.error('Make admin error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get group messages
// @route   GET /api/groups/:groupId/messages
// @access  Private
const getGroupMessages = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isMember = group.members.some(
            m => m.userId.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not a member of this group' });
        }

        const messages = await Message.find({ groupId: req.params.groupId })
            .populate('senderId', 'name avatar')
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json(messages.reverse());
    } catch (error) {
        console.error('Get group messages error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send group message
// @route   POST /api/groups/:groupId/messages
// @access  Private
const sendGroupMessage = async (req, res) => {
    try {
        const { content, messageType, fileUrl, fileName, fileSize, mimeType, thumbnail } = req.body;

        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isMember = group.members.some(
            m => m.userId.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: 'Not a member of this group' });
        }

        const message = await Message.create({
            senderId: req.user._id,
            groupId: req.params.groupId,
            messageType: messageType || 'text',
            content: content || '',
            fileUrl: fileUrl || '',
            fileName: fileName || '',
            fileSize: fileSize || 0,
            mimeType: mimeType || '',
            thumbnail: thumbnail || ''
        });

        group.lastMessage = message._id;
        await group.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name avatar');

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error('Send group message error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
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
};
