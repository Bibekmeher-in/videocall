import axios from 'axios';
import { useAuthStore } from '../context/store';

const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

const api = axios.create({
    baseURL: API_URL
});

const normalizeUploadFormData = (formData, fieldName) => {
    if (!(formData instanceof FormData) || formData.has(fieldName)) {
        return formData;
    }

    const normalizedFormData = new FormData();
    let fileFieldRenamed = false;

    for (const [key, value] of formData.entries()) {
        const shouldRenameField = !fileFieldRenamed && value instanceof Blob;

        if (shouldRenameField) {
            const filename = typeof value.name === 'string' ? value.name : undefined;

            if (filename) {
                normalizedFormData.append(fieldName, value, filename);
            } else {
                normalizedFormData.append(fieldName, value);
            }

            fileFieldRenamed = true;
            continue;
        }

        if (value instanceof Blob) {
            const filename = typeof value.name === 'string' ? value.name : undefined;

            if (filename) {
                normalizedFormData.append(key, value, filename);
            } else {
                normalizedFormData.append(key, value);
            }

            continue;
        }

        normalizedFormData.append(key, value);
    }

    return normalizedFormData;
};

const postUpload = (url, formData, fieldName) => {
    const normalizedData = normalizeUploadFormData(formData, fieldName);
    // Don't set Content-Type header for FormData - let axios/browser handle it
    return api.post(url, normalizedData, {
        headers: {
            'Content-Type': undefined
        }
    });
};

// Request interceptor to add auth token and set Content-Type
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Only set Content-Type for non-FormData requests
        if (!(config.data instanceof FormData) && !config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getProfile: () => api.get('/auth/profile'),
    updateProfile: (data) => api.put('/auth/profile', data),
    changePassword: (data) => api.put('/auth/password', data),
    getUsers: () => api.get('/auth/users'),
    getUserById: (id) => api.get(`/auth/users/${id}`),
    searchUsers: (query) => api.get(`/auth/search?q=${query}`),
    addContact: (userId) => api.post(`/auth/contacts/${userId}`),
    getContacts: () => api.get('/auth/contacts')
};

// Messages API
export const messageAPI = {
    getMessages: (contactId, page = 1) => api.get(`/messages/${contactId}?page=${page}`),
    sendMessage: (data) => api.post('/messages', data),
    markAsRead: (messageId) => api.put(`/messages/${messageId}/read`),
    markAllAsRead: (contactId) => api.put(`/messages/${contactId}/read-all`),
    deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
    getConversations: () => api.get('/messages/conversations'),
    addReaction: (messageId, emoji) => api.put(`/messages/${messageId}/reaction`, { emoji })
};

// Groups API
export const groupAPI = {
    getGroups: () => api.get('/groups'),
    createGroup: (data) => api.post('/groups', data),
    getGroupById: (groupId) => api.get(`/groups/${groupId}`),
    updateGroup: (groupId, data) => api.put(`/groups/${groupId}`, data),
    deleteGroup: (groupId) => api.delete(`/groups/${groupId}`),
    addMembers: (groupId, memberIds) => api.post(`/groups/${groupId}/members`, { memberIds }),
    removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
    makeAdmin: (groupId, userId) => api.put(`/groups/${groupId}/admin/${userId}`),
    getGroupMessages: (groupId, page = 1) => api.get(`/groups/${groupId}/messages?page=${page}`),
    sendGroupMessage: (groupId, data) => api.post(`/groups/${groupId}/messages`, data)
};

// Stories API
export const storyAPI = {
    getStories: () => api.get('/stories'),
    getUserStories: (userId) => api.get(`/stories/${userId}`),
    createStory: (data) => api.post('/stories', data),
    viewStory: (storyId) => api.post(`/stories/${storyId}/view`),
    deleteStory: (storyId) => api.delete(`/stories/${storyId}`),
    getStoryViewers: (storyId) => api.get(`/stories/${storyId}/viewers`)
};

// Calls API
export const callAPI = {
    initiateCall: (data) => api.post('/calls', data),
    getCallByRoomId: (roomId) => api.get(`/calls/room/${roomId}`),
    updateCallStatus: (callId, data) => api.put(`/calls/${callId}`, data),
    endCall: (callId) => api.put(`/calls/${callId}/end`),
    getCallHistory: () => api.get('/calls/history'),
    joinCall: (callId) => api.post(`/calls/${callId}/join`),
    leaveCall: (callId) => api.post(`/calls/${callId}/leave`)
};

// Upload API
export const uploadAPI = {
    uploadImage: (formData) => postUpload('/upload/image', formData, 'image'),
    uploadVideo: (formData) => postUpload('/upload/video', formData, 'video'),
    uploadFile: (formData) => postUpload('/upload/file', formData, 'file'),
    uploadAvatar: (formData) => postUpload('/upload/avatar', formData, 'avatar'),
    deleteFile: (filename) => api.delete(`/upload/${filename}`)
};

export default api;
