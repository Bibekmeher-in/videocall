import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore, useChatStore, useGroupStore } from '../context/store';
import { authAPI, messageAPI, groupAPI } from '../services/api';
import { FaSearch, FaPlus, FaPhone, FaVideo, FaEllipsisV, FaUserPlus } from 'react-icons/fa';
import PageScene3D from '../components/PageScene3D';

function Home() {
    const { user } = useAuthStore();
    const { conversations, setConversations, activeConversation, setActiveConversation } = useChatStore();
    const { groups, setGroups, activeGroup, setActiveGroup } = useGroupStore();
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, conversationsRes, groupsRes] = await Promise.all([
                authAPI.getUsers(),
                messageAPI.getConversations(),
                groupAPI.getGroups()
            ]);
            setUsers(usersRes.data);
            setConversations(conversationsRes.data);
            setGroups(groupsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedMembers.length === 0) return;

        try {
            const memberIds = selectedMembers.map(m => m._id);
            await groupAPI.createGroup({
                groupName: newGroupName,
                memberIds
            });
            setShowNewGroup(false);
            setNewGroupName('');
            setSelectedMembers([]);
            fetchData();
        } catch (error) {
            console.error('Error creating group:', error);
        }
    };

    const toggleMemberSelection = (user) => {
        setSelectedMembers(prev => {
            const isSelected = prev.find(m => m._id === user._id);
            if (isSelected) {
                return prev.filter(m => m._id !== user._id);
            }
            return [...prev, user];
        });
    };

    const normalizedSearch = searchQuery.toLowerCase();
    const filteredUsers = users.filter((u) => {
        const name = (u?.name || '').toLowerCase();
        const email = (u?.email || '').toLowerCase();
        return name.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
    return (
        <div className="relative flex h-[calc(100vh-8rem)] md:h-[calc(100vh-64px)] overflow-hidden">
            <PageScene3D variant="home" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/35 via-transparent to-indigo-950/35 pointer-events-none z-0" />
            <div className="relative z-10 flex h-full w-full flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-80 bg-slate-950/45 backdrop-blur-xl border-r border-cyan-200/20 flex flex-col">
                {/* Search and New Chat */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => setShowNewChat(!showNewChat)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                        >
                            <FaPlus /> New Chat
                        </button>
                        <button
                            onClick={() => setShowNewGroup(!showNewGroup)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-secondary-500 text-white rounded-lg text-sm font-medium hover:bg-secondary-600 transition-colors"
                        >
                            <FaPlus /> New Group
                        </button>
                    </div>
                </div>

                {/* New Chat Dropdown */}
                {showNewChat && (
                    <div className="p-4 border-b border-cyan-200/15 bg-slate-950/35">
                        <h3 className="text-sm font-semibold mb-2">Start a new chat</h3>
                        <div className="max-h-56 md:max-h-48 overflow-y-auto space-y-2">
                            {filteredUsers.map(u => (
                                <Link
                                    key={u._id}
                                    to={`/chat/${u._id}`}
                                    onClick={() => setShowNewChat(false)}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                                        {u.avatar ? (
                                            <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <span className="text-primary-600 dark:text-primary-400 font-semibold">
                                                {(u.name || '?').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">{u.name || "Unknown User"}</p>
                                        <p className="text-xs text-gray-500">{u.email}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* New Group Modal */}
                {showNewGroup && (
                    <div className="p-4 border-b border-cyan-200/15 bg-slate-950/35">
                        <h3 className="text-sm font-semibold mb-2">Create new group</h3>
                        <input
                            type="text"
                            placeholder="Group name"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-600 rounded-lg text-sm mb-2"
                        />
                        <p className="text-xs text-gray-500 mb-2">Select members:</p>
                        <div className="max-h-40 md:max-h-32 overflow-y-auto space-y-1">
                            {users.map(u => (
                                <label
                                    key={u._id}
                                    className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedMembers.some(m => m._id === u._id)}
                                        onChange={() => toggleMemberSelection(u)}
                                        className="rounded text-primary-500"
                                    />
                                    <span className="text-sm">{u.name || "Unknown User"}</span>
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={handleCreateGroup}
                            disabled={!newGroupName.trim() || selectedMembers.length === 0}
                            className="w-full mt-2 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            Create Group
                        </button>
                    </div>
                )}

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {/* Groups Section */}
                    {groups.length > 0 && (
                        <div className="p-2">
                            <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Groups</h3>
                            {groups.map(group => (
                                <Link
                                    key={group._id}
                                    to={`/group/${group._id}`}
                                    className={`flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 ${activeGroup?._id === group._id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-secondary-100 dark:bg-secondary-900 flex items-center justify-center">
                                        {group.groupAvatar ? (
                                            <img src={group.groupAvatar} alt={group.groupName} className="w-12 h-12 rounded-full object-cover" />
                                        ) : (
                                            <span className="text-secondary-600 dark:text-secondary-400 font-bold text-lg">
                                                {group.groupName.charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{group.groupName}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {group.members?.length || 0} members
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Conversations Section */}
                    <div className="p-2">
                        <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Chats</h3>
                        {conversations.length === 0 ? (
                            <p className="px-3 py-4 text-sm text-gray-500 text-center">No conversations yet</p>
                        ) : (
                            conversations.map(conv => (
                                <Link
                                    key={conv.contact?._id}
                                    to={`/chat/${conv.contact?._id}`}
                                    className={`flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 ${activeConversation?._id === conv.contact?._id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                        }`}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                                            {conv.contact?.avatar ? (
                                                <img src={conv.contact.avatar} alt={conv.contact.name} className="w-12 h-12 rounded-full object-cover" />
                                            ) : (
                                                <span className="text-primary-600 dark:text-primary-400 font-bold text-lg">
                                                    {conv.contact?.name?.charAt(0).toUpperCase() || '?'}
                                                </span>
                                            )}
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${conv.contact?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                                            }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{conv.contact?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {conv.lastMessage?.content || 'No messages yet'}
                                        </p>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="hidden md:flex flex-1 items-center justify-center bg-slate-950/30 backdrop-blur-md">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Welcome, {user?.name}</h2>
                    <p className="text-gray-500">Select a conversation or start a new one</p>
                </div>
            </div>
            </div>
        </div>
    );
}

export default Home;

