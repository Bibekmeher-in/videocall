const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');

const onlineUsers = new Map();

const initializeSocket = (io) => {
    // Authentication middleware for socket
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
            const user = await User.findById(decoded.id);

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.user.name} (${socket.id})`);

        // Add user to online users
        onlineUsers.set(socket.user._id.toString(), {
            socketId: socket.id,
            user: socket.user
        });

        // Update user status
        await User.findByIdAndUpdate(socket.user._id, {
            status: 'online',
            socketId: socket.id
        });

        // Broadcast online users to all
        io.emit('users_online', Array.from(onlineUsers.keys()));

        // Join user's personal room
        socket.join(`user:${socket.user._id}`);

        // Handle typing events
        socket.on('typing', (data) => {
            const { receiverId, isGroup, groupId } = data;
            if (isGroup && groupId) {
                socket.to(`group:${groupId}`).emit('user_typing', {
                    senderId: socket.user._id,
                    senderName: socket.user.name,
                    groupId
                });
            } else if (receiverId) {
                socket.to(`user:${receiverId}`).emit('user_typing', {
                    senderId: socket.user._id,
                    senderName: socket.user.name
                });
            }
        });

        socket.on('stop_typing', (data) => {
            const { receiverId, isGroup, groupId } = data;
            if (isGroup && groupId) {
                socket.to(`group:${groupId}`).emit('user_stop_typing', {
                    senderId: socket.user._id,
                    groupId
                });
            } else if (receiverId) {
                socket.to(`user:${receiverId}`).emit('user_stop_typing', {
                    senderId: socket.user._id
                });
            }
        });

        // Handle sending messages
        socket.on('send_message', (data) => {
            const { receiverId, message, isGroup, groupId } = data;

            if (isGroup && groupId) {
                // Send to group room
                io.to(`group:${groupId}`).emit('receive_message', {
                    ...message,
                    senderId: {
                        _id: socket.user._id,
                        name: socket.user.name,
                        avatar: socket.user.avatar
                    }
                });
            } else if (receiverId) {
                // Send to receiver
                socket.to(`user:${receiverId}`).emit('receive_message', message);
                // Send back to sender for confirmation
                socket.emit('message_sent', message);
            }
        });

        // Handle message read receipts
        socket.on('message_read', (data) => {
            const { messageId, senderId } = data;
            socket.to(`user:${senderId}`).emit('message_read', {
                messageId,
                readerId: socket.user._id
            });
        });

        // Handle group management
        socket.on('join_group', (groupId) => {
            socket.join(`group:${groupId}`);
            socket.to(`group:${groupId}`).emit('user_joined_group', {
                userId: socket.user._id,
                userName: socket.user.name
            });
        });

        socket.on('leave_group', (groupId) => {
            socket.leave(`group:${groupId}`);
            socket.to(`group:${groupId}`).emit('user_left_group', {
                userId: socket.user._id,
                userName: socket.user.name
            });
        });

        // Handle call events
        socket.on('call_user', (data) => {
            const { calleeId, callType, roomId, caller } = data;
            socket.to(`user:${calleeId}`).emit('incoming_call', {
                callerId: socket.user._id,
                callerName: socket.user.name,
                callerAvatar: socket.user.avatar,
                callType,
                roomId
            });
        });

        socket.on('group_call_user', async (data) => {
            const { groupId, callType, roomId } = data;
            if (!groupId || !roomId) {
                return;
            }

            try {
                const group = await Group.findById(groupId).select('groupName members');
                if (!group) {
                    return;
                }

                const isMember = group.members.some(
                    (member) => member.userId.toString() === socket.user._id.toString()
                );

                if (!isMember) {
                    return;
                }

                group.members.forEach((member) => {
                    const memberUserId = member.userId.toString();
                    if (memberUserId === socket.user._id.toString()) {
                        return;
                    }

                    io.to(`user:${memberUserId}`).emit('incoming_call', {
                        callerId: socket.user._id,
                        callerName: socket.user.name,
                        callerAvatar: socket.user.avatar,
                        callType,
                        roomId,
                        isGroupCall: true,
                        groupId: group._id,
                        groupName: group.groupName
                    });
                });
            } catch (error) {
                console.error('Group call invite error:', error);
            }
        });

        socket.on('accept_call', (data) => {
            const { callerId, roomId } = data || {};
            if (!callerId || !roomId) {
                return;
            }

            const acceptedAt = Date.now();
            const payload = {
                roomId,
                callerId,
                calleeId: socket.user._id,
                acceptedBy: socket.user._id,
                acceptedAt
            };

            io.to(`user:${callerId}`).emit('call_accepted', payload);
            socket.emit('call_accepted', payload);
            io.to(`call:${roomId}`).emit('call_accepted', payload);
        });

        socket.on('reject_call', (data) => {
            const { callerId, roomId } = data;
            socket.to(`user:${callerId}`).emit('call_rejected', {
                roomId,
                calleeId: socket.user._id
            });
        });

        socket.on('end_call', (data) => {
            const { participantId, roomId } = data || {};
            const payload = {
                roomId,
                endedBy: socket.user._id
            };

            if (participantId) {
                io.to(`user:${participantId}`).emit('call_ended', payload);
            }
            if (roomId) {
                io.to(`call:${roomId}`).emit('call_ended', payload);
            }
            socket.emit('call_ended', payload);
        });

        socket.on('end_call_room', (data) => {
            const { roomId } = data || {};
            if (!roomId) {
                return;
            }

            socket.to(`call:${roomId}`).emit('call_ended', {
                roomId,
                endedBy: socket.user._id
            });
        });

        // WebRTC signaling for calls
        socket.on('webrtc_signal', (data) => {
            const { to, signal } = data;
            socket.to(`user:${to}`).emit('webrtc_signal', {
                from: socket.user._id,
                signal
            });
        });

        // Join call room
        socket.on('join_call_room', (roomId) => {
            const room = io.sockets.adapter.rooms.get(`call:${roomId}`) || new Set();
            const existingUserIds = Array.from(room)
                .map((socketId) => io.sockets.sockets.get(socketId)?.user?._id?.toString())
                .filter(Boolean);

            socket.join(`call:${roomId}`);
            socket.emit('call_room_participants', {
                roomId,
                participants: existingUserIds
            });
            socket.to(`call:${roomId}`).emit('user_joined_call', {
                userId: socket.user._id,
                userName: socket.user.name,
                userAvatar: socket.user.avatar
            });
        });

        socket.on('leave_call_room', (roomId) => {
            socket.leave(`call:${roomId}`);
            socket.to(`call:${roomId}`).emit('user_left_call', {
                userId: socket.user._id
            });
        });

        // Handle story events
        socket.on('story_viewed', (data) => {
            const { storyOwnerId, storyId } = data;
            socket.to(`user:${storyOwnerId}`).emit('story_viewed', {
                storyId,
                viewerId: socket.user._id,
                viewerName: socket.user.name
            });
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.user.name}`);

            onlineUsers.delete(socket.user._id.toString());

            // Update user status
            await User.findByIdAndUpdate(socket.user._id, {
                status: 'offline',
                lastSeen: new Date(),
                socketId: null
            });

            // Broadcast updated online users
            io.emit('users_online', Array.from(onlineUsers.keys()));
            io.emit('user_offline', socket.user._id);
        });
    });

    return io;
};

module.exports = initializeSocket;
