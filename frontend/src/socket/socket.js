import { io } from 'socket.io-client';
import { useAuthStore, useChatStore, useCallStore, useGroupStore, useStoryStore } from '../context/store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect() {
        const token = useAuthStore.getState().token;

        if (!token) {
            console.error('No token available for socket connection');
            return;
        }

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        this.setupEventListeners();
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    setupEventListeners() {
        const socket = this.socket;

        socket.on('connect', () => {
            console.log('Socket connected');
            this.connected = true;
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.connected = false;
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Online users
        socket.on('users_online', (userIds) => {
            // Update online users in store
            console.log('Online users:', userIds);
        });

        socket.on('user_offline', (userId) => {
            console.log('User offline:', userId);
        });

        // Messages
        socket.on('receive_message', (message) => {
            const { activeConversation } = useChatStore.getState();

            // Add message to store
            useChatStore.getState().addMessage(message);

            // If message is from active conversation, mark as read
            if (activeConversation &&
                (message.senderId?._id === activeConversation._id ||
                    message.senderId === activeConversation._id)) {
                socket.emit('message_read', {
                    messageId: message._id,
                    senderId: message.senderId?._id || message.senderId
                });
            }
        });

        socket.on('message_sent', (message) => {
            console.log('Message sent confirmation:', message);
        });

        socket.on('message_read', ({ messageId, readerId }) => {
            // Update message read status in store
            const messages = useChatStore.getState().messages;
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? { ...msg, seen: true } : msg
            );
            useChatStore.getState().setMessages(updatedMessages);
        });

        // Typing
        socket.on('user_typing', ({ senderId, senderName, groupId }) => {
            if (groupId) {
                useGroupStore.getState().setTypingUser(senderId, true);
            } else {
                useChatStore.getState().setTypingUser(senderId, true);
            }
        });

        socket.on('user_stop_typing', ({ senderId, groupId }) => {
            if (groupId) {
                useGroupStore.getState().clearTypingUser(senderId);
            } else {
                useChatStore.getState().clearTypingUser(senderId);
            }
        });

        // Groups
        socket.on('user_joined_group', ({ userId, userName }) => {
            console.log(`${userName} joined the group`);
        });

        socket.on('user_left_group', ({ userId, userName }) => {
            console.log(`${userName} left the group`);
        });

        // Calls
        socket.on('incoming_call', (payload) => {
            useCallStore.getState().setCallAcceptedAt(null);
            useCallStore.getState().setIncomingCall({
                ...payload
            });
            useCallStore.getState().setCallStatus('ringing');
        });

        socket.on('call_accepted', ({ roomId, calleeId, acceptedAt }) => {
            useCallStore.getState().setCallAcceptedAt(acceptedAt || Date.now());
            useCallStore.getState().setCallStatus('connected');
            window.dispatchEvent(new CustomEvent('call_accepted', {
                detail: { roomId, calleeId, acceptedAt: acceptedAt || Date.now() }
            }));
        });

        socket.on('call_rejected', ({ roomId, calleeId }) => {
            useCallStore.getState().setCallStatus('ended');
            setTimeout(() => useCallStore.getState().resetCall(), 2000);
        });

        socket.on('call_ended', ({ roomId, endedBy }) => {
            useCallStore.getState().setCallStatus('ended');
            useCallStore.getState().setCallAcceptedAt(null);
            window.dispatchEvent(new CustomEvent('remote_call_ended', {
                detail: { roomId, endedBy }
            }));
            setTimeout(() => useCallStore.getState().resetCall(), 2000);
        });

        // WebRTC signaling
        socket.on('webrtc_signal', ({ from, signal }) => {
            // This will be handled by the call component
            window.dispatchEvent(new CustomEvent('webrtc_signal', { detail: { from, signal } }));
        });

        socket.on('user_joined_call', ({ userId, userName, userAvatar }) => {
            window.dispatchEvent(new CustomEvent('user_joined_call', {
                detail: { userId, userName, userAvatar }
            }));
        });

        socket.on('user_left_call', ({ userId }) => {
            window.dispatchEvent(new CustomEvent('user_left_call', { detail: { userId } }));
        });

        socket.on('call_room_participants', ({ roomId, participants }) => {
            window.dispatchEvent(new CustomEvent('call_room_participants', {
                detail: { roomId, participants }
            }));
        });

        // Stories
        socket.on('story_viewed', ({ storyId, viewerId, viewerName }) => {
            console.log(`${viewerName} viewed your story`);
        });
    }

    // Message methods
    sendMessage(data) {
        if (this.socket) {
            this.socket.emit('send_message', data);
        }
    }

    sendTyping(receiverId, isGroup = false, groupId = null) {
        if (this.socket) {
            this.socket.emit('typing', { receiverId, isGroup, groupId });
        }
    }

    stopTyping(receiverId, isGroup = false, groupId = null) {
        if (this.socket) {
            this.socket.emit('stop_typing', { receiverId, isGroup, groupId });
        }
    }

    // Group methods
    joinGroup(groupId) {
        if (this.socket) {
            this.socket.emit('join_group', groupId);
        }
    }

    leaveGroup(groupId) {
        if (this.socket) {
            this.socket.emit('leave_group', groupId);
        }
    }

    // Call methods
    callUser(calleeId, callType, roomId, caller) {
        if (this.socket) {
            this.socket.emit('call_user', { calleeId, callType, roomId, caller });
        }
    }

    callGroup(groupId, callType, roomId, caller) {
        if (this.socket) {
            this.socket.emit('group_call_user', { groupId, callType, roomId, caller });
        }
    }

    acceptCall(callerId, roomId) {
        if (this.socket) {
            this.socket.emit('accept_call', { callerId, roomId });
        }
    }

    rejectCall(callerId, roomId) {
        if (this.socket) {
            this.socket.emit('reject_call', { callerId, roomId });
        }
    }

    endCall(participantId, roomId) {
        if (this.socket) {
            this.socket.emit('end_call', { participantId, roomId });
        }
    }

    endCallRoom(roomId) {
        if (this.socket) {
            this.socket.emit('end_call_room', { roomId });
        }
    }

    sendWebRTCSignal(to, signal) {
        if (this.socket) {
            this.socket.emit('webrtc_signal', { to, signal });
        }
    }

    joinCallRoom(roomId) {
        if (this.socket) {
            this.socket.emit('join_call_room', roomId);
        }
    }

    leaveCallRoom(roomId) {
        if (this.socket) {
            this.socket.emit('leave_call_room', roomId);
        }
    }

    // Story methods
    viewStory(storyOwnerId, storyId) {
        if (this.socket) {
            this.socket.emit('story_viewed', { storyOwnerId, storyId });
        }
    }
}

export const socketService = new SocketService();
export default socketService;
