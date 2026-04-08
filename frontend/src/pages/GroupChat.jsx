import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, useGroupStore, useUIStore } from '../context/store';
import { groupAPI, uploadAPI, callAPI } from '../services/api';
import socketService from '../socket/socket';
import { FaPaperPlane, FaPaperclip, FaPhone, FaVideo, FaUser, FaImage, FaFile } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { requestCallStartPermissions } from '../utils/callPermissionGate';
import { MESSAGE_UPLOAD_ACCEPT, MESSAGE_UPLOAD_ACCEPT_STRING, getUploadErrorMessage, validateMessageUpload } from '../utils/uploadValidation';

function GroupChat() {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { addToast } = useUIStore();
    const { groupMessages, setGroupMessages, addGroupMessage, typingUsers } = useGroupStore();
    const [group, setGroup] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [startingCall, setStartingCall] = useState(false);
    const [callPermissionError, setCallPermissionError] = useState('');
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchGroup();
        fetchMessages();

        // Join group socket room
        socketService.joinGroup(groupId);

        return () => {
            socketService.leaveGroup(groupId);
        };
    }, [groupId]);

    useEffect(() => {
        scrollToBottom();
    }, [groupMessages]);

    useEffect(() => {
        const handleReceiveGroupMessage = (message) => {
            if (message.groupId === groupId) {
                addGroupMessage(message);
            }
        };

        socketService.socket?.on('receive_message', handleReceiveGroupMessage);

        return () => {
            socketService.socket?.off('receive_message', handleReceiveGroupMessage);
        };
    }, [groupId, addGroupMessage]);

    const fetchGroup = async () => {
        try {
            const { data } = await groupAPI.getGroupById(groupId);
            setGroup(data);
        } catch (error) {
            console.error('Error fetching group:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const { data } = await groupAPI.getGroupMessages(groupId);
            setGroupMessages(data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        setSending(true);
        try {
            const messageData = {
                content: messageText,
                messageType: 'text'
            };

            const { data } = await groupAPI.sendGroupMessage(groupId, messageData);
            addGroupMessage(data);

            socketService.sendMessage({
                message: data,
                isGroup: true,
                groupId
            });

            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        const validation = validateMessageUpload(file);

        if (!validation.isValid) {
            addToast({ type: 'error', message: validation.errorMessage });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setSending(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadApi = validation.uploadKind === 'image' ? uploadAPI.uploadImage :
                validation.uploadKind === 'video' ? uploadAPI.uploadVideo :
                    uploadAPI.uploadFile;

            const { data: uploadData } = await uploadApi(formData);

            const messageData = {
                messageType: validation.messageType,
                content: file.name,
                fileUrl: uploadData.url,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type
            };

            const { data } = await groupAPI.sendGroupMessage(groupId, messageData);
            addGroupMessage(data);

            socketService.sendMessage({
                message: data,
                isGroup: true,
                groupId
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            addToast({
                type: 'error',
                message: getUploadErrorMessage(error, 'Unable to upload file right now. Please try again.')
            });
        } finally {
            setSending(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: handleFileUpload,
        multiple: false,
        accept: MESSAGE_UPLOAD_ACCEPT,
        onDropRejected: () => {
            addToast({
                type: 'error',
                message: 'Unsupported file type. Choose a supported image, video, or document.'
            });
        }
    });

    const handleTyping = () => {
        socketService.sendTyping(null, true, groupId);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socketService.stopTyping(null, true, groupId);
        }, 2000);
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const initiateCall = async (callType) => {
        setCallPermissionError('');
        setStartingCall(true);

        try {
            const permissionResult = await requestCallStartPermissions({ callType });
            if (!permissionResult.granted) {
                setCallPermissionError(permissionResult.message || 'Permission denied.');
                return;
            }

            const { data: callData } = await callAPI.initiateCall({
                callType,
                isGroupCall: true,
                groupId
            });

            socketService.callGroup(groupId, callType, callData.roomId, {
                _id: user?._id,
                name: user?.name,
                avatar: user?.avatar
            });

            navigate(`/call/${callData.roomId}?type=${callType}&group=true`);
        } catch (error) {
            console.error('Error initiating group call:', error);
            setCallPermissionError('Unable to start call right now. Please try again.');
        } finally {
            setStartingCall(false);
        }
    };

    if (!group) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-64px)]">
            {/* Group Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-secondary-100 dark:bg-secondary-900 flex items-center justify-center">
                        {group.groupAvatar ? (
                            <img src={group.groupAvatar} alt={group.groupName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <span className="text-secondary-600 dark:text-secondary-400 font-semibold">
                                {group.groupName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold truncate">{group.groupName}</h3>
                        <p className="text-xs text-gray-500 truncate">
                            {group.members?.length} members
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => initiateCall('audio')}
                        disabled={startingCall}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                        <FaPhone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                        onClick={() => initiateCall('video')}
                        disabled={startingCall}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                        <FaVideo className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>
            {callPermissionError && (
                <div className="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 border-b border-red-100 dark:border-red-800">
                    {callPermissionError}
                </div>
            )}

            {/* Messages Area */}
            <div
                {...getRootProps()}
                className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-slate-900 ${isDragActive ? 'bg-primary-50' : ''}`}
            >
                <input {...getInputProps()} />

                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                ) : (
                    groupMessages.map((message, index) => {
                        const senderId = message.senderId?._id || message.senderId;
                        const isSent = senderId === user._id;

                        return (
                            <div
                                key={message._id || index}
                                className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
                                    {!isSent && (
                                        <p className="text-xs font-semibold mb-1 text-primary-300">
                                            {message.senderId?.name || 'Unknown'}
                                        </p>
                                    )}

                                    {message.messageType !== 'text' && (
                                        <div className="mb-2">
                                            {message.messageType === 'image' && message.fileUrl && (
                                                <img
                                                    src={message.fileUrl}
                                                    alt="Shared"
                                                    className="max-w-[70vw] sm:max-w-xs rounded-lg cursor-pointer"
                                                    onClick={() => window.open(message.fileUrl, '_blank')}
                                                />
                                            )}
                                            {message.messageType === 'video' && message.fileUrl && (
                                                <video src={message.fileUrl} controls className="max-w-[70vw] sm:max-w-xs rounded-lg" />
                                            )}
                                            {message.messageType === 'document' && (
                                                <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                                    <FaFile />
                                                    <span className="text-sm">{message.fileName || 'Document'}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {message.content && <p>{message.content}</p>}

                                    <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isSent ? 'text-white/70' : 'text-gray-400'}`}>
                                        <span>{formatTime(message.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept={MESSAGE_UPLOAD_ACCEPT_STRING}
                        onChange={(e) => handleFileUpload(e.target.files)}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
                        disabled={sending}
                    >
                        <FaPaperclip className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>

                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => {
                            setMessageText(e.target.value);
                            handleTyping();
                        }}
                        placeholder={`Message ${group.groupName}...`}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={sending}
                    />

                    <button
                        type="submit"
                        disabled={!messageText.trim() || sending}
                        className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                    >
                        {sending ? (
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <FaPaperPlane className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default GroupChat;
