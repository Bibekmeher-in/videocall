import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setToken: (token) => set({ token }),
            login: (user, token) => set({ user, token, isAuthenticated: true }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
            updateUser: (updates) => set((state) => ({
                user: { ...state.user, ...updates }
            })),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, user: state.user }),
        }
    )
);

// Chat Store
export const useChatStore = create((set, get) => ({
    conversations: [],
    activeConversation: null,
    messages: [],
    typingUsers: {},

    setConversations: (conversations) => set({ conversations }),
    setActiveConversation: (activeConversation) => set({ activeConversation, messages: [] }),
    setMessages: (messages) => set({ messages }),
    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
    })),
    setTypingUser: (userId, isTyping) => set((state) => ({
        typingUsers: { ...state.typingUsers, [userId]: isTyping }
    })),
    clearTypingUser: (userId) => set((state) => {
        const { [userId]: _, ...rest } = state.typingUsers;
        return { typingUsers: rest };
    }),
}));

// Group Store
export const useGroupStore = create((set) => ({
    groups: [],
    activeGroup: null,
    groupMessages: [],

    setGroups: (groups) => set({ groups }),
    setActiveGroup: (activeGroup) => set({ activeGroup, groupMessages: [] }),
    setGroupMessages: (groupMessages) => set({
        groupMessages: groupMessages.filter((message, index, arr) => {
            const messageId = message?._id;
            if (!messageId) return true;
            return arr.findIndex((item) => item?._id === messageId) === index;
        })
    }),
    addGroupMessage: (message) => set((state) => {
        const messageId = message?._id;
        if (!messageId) {
            return { groupMessages: [...state.groupMessages, message] };
        }

        const existingIndex = state.groupMessages.findIndex((item) => item?._id === messageId);
        if (existingIndex === -1) {
            return { groupMessages: [...state.groupMessages, message] };
        }

        const nextMessages = [...state.groupMessages];
        nextMessages[existingIndex] = { ...nextMessages[existingIndex], ...message };
        return { groupMessages: nextMessages };
    }),
}));

// Call Store
export const useCallStore = create((set) => ({
    currentCall: null,
    incomingCall: null,
    callStatus: 'idle', // idle, ringing, connected, ended
    callAcceptedAt: null,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,

    setCurrentCall: (currentCall) => set({ currentCall }),
    setIncomingCall: (incomingCall) => set({ incomingCall }),
    setCallStatus: (callStatus) => set({ callStatus }),
    setCallAcceptedAt: (callAcceptedAt) => set({ callAcceptedAt }),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    toggleVideo: () => set((state) => ({ isVideoOff: !state.isVideoOff })),
    toggleScreenShare: () => set((state) => ({ isScreenSharing: !state.isScreenSharing })),
    resetCall: () => set({
        currentCall: null,
        incomingCall: null,
        callStatus: 'idle',
        callAcceptedAt: null,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false
    }),
}));

// Story Store
export const useStoryStore = create((set) => ({
    stories: [],
    activeStory: null,

    setStories: (stories) => set({ stories }),
    setActiveStory: (activeStory) => set({ activeStory }),
    addStory: (story) => set((state) => ({
        stories: [story, ...state.stories]
    })),
}));

// UI Store
export const useUIStore = create((set) => ({
    darkMode: false,
    sidebarOpen: true,
    modalOpen: null,
    toasts: [],

    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    setDarkMode: (darkMode) => set({ darkMode }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    openModal: (modalId) => set({ modalOpen: modalId }),
    closeModal: () => set({ modalOpen: null }),
    addToast: (toast) => set((state) => ({
        toasts: [...state.toasts, { id: Date.now(), ...toast }]
    })),
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
    })),
}));
