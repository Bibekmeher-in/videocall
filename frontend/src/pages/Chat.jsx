import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, useChatStore, useCallStore, useUIStore } from '../context/store';
import { authAPI, messageAPI, uploadAPI, callAPI } from '../services/api';
import socketService from '../socket/socket';
import { FaPaperPlane, FaPaperclip, FaMicrophone, FaPhone, FaVideo, FaImage, FaFile, FaSmile, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import { requestCallStartPermissions } from '../utils/callPermissionGate';
import PageScene3D from '../components/PageScene3D';
import { MESSAGE_UPLOAD_ACCEPT, MESSAGE_UPLOAD_ACCEPT_STRING, getUploadErrorMessage, validateMessageUpload } from '../utils/uploadValidation';

function Chat() {
    const { contactId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { addToast } = useUIStore();
    const { messages, setMessages, addMessage, typingUsers } = useChatStore();
    const { setCurrentCall, setCallStatus, setCallAcceptedAt } = useCallStore();
    const [contact, setContact] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [startingCall, setStartingCall] = useState(false);
    const [callPermissionError, setCallPermissionError] = useState('');
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchContact();
        fetchMessages();
    }, [contactId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Listen for incoming messages
        const handleReceiveMessage = (message) => {
            const senderId = message.senderId?._id || message.senderId;
            if (senderId === contactId) {
                addMessage(message);
            }
        };

        socketService.socket?.on('receive_message', handleReceiveMessage);

        return () => {
            socketService.socket?.off('receive_message', handleReceiveMessage);
        };
    }, [contactId, addMessage]);

    const fetchContact = async () => {
        try {
            const { data } = await authAPI.getUserById(contactId);
            setContact(data);
        } catch (error) {
            console.error('Error fetching contact:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const { data } = await messageAPI.getMessages(contactId);
            setMessages(data);
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
                receiverId: contactId,
                content: messageText,
                messageType: 'text'
            };

            const { data } = await messageAPI.sendMessage(messageData);
            addMessage(data);

            // Send via socket for real-time delivery
            socketService.sendMessage({
                receiverId: contactId,
                message: data,
                isGroup: false
            });

            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleOpenImage = (imageUrl) => {
        // Defer window.open to avoid blocking by browser security
        setTimeout(() => {
            window.open(imageUrl, '_blank');
        }, 0);
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
                receiverId: contactId,
                messageType: validation.messageType,
                content: file.name,
                fileUrl: uploadData.url,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type
            };

            const { data } = await messageAPI.sendMessage(messageData);
            addMessage(data);

            socketService.sendMessage({
                receiverId: contactId,
                message: data,
                isGroup: false
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
        socketService.sendTyping(contactId, false);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socketService.stopTyping(contactId, false);
        }, 2000);
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
                calleeId: contactId,
                callType,
                isGroupCall: false
            });

            setCurrentCall(callData);
            setCallAcceptedAt(null);
            setCallStatus('ringing');

            socketService.callUser(contactId, callType, callData.roomId, {
                _id: user?._id,
                name: user?.name,
                avatar: user?.avatar
            });

            navigate(`/call/${callData.roomId}?type=${callType}`);
        } catch (error) {
            console.error('Error initiating call:', error);
            setCallPermissionError('Unable to start call right now. Please try again.');
        } finally {
            setStartingCall(false);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isTyping = typingUsers[contactId];
    const contactName = contact?.name || 'Unknown User';
    const contactInitial = contactName.charAt(0).toUpperCase();
    const contactStatus = contact?.status || 'offline';
    const contactLastSeen = contact?.lastSeen;

    if (!contact) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-64px)] overflow-hidden">
            <PageScene3D variant="chat" />
            <div className="absolute inset-0 bg-gradient-to-br from-sky-950/35 via-transparent to-indigo-950/35 pointer-events-none z-0" />
            <div className="relative z-10 flex flex-col h-full">
                {/* Chat Header */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-slate-950/45 backdrop-blur-xl border-b border-cyan-200/20">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                                {contact.avatar ? (
                                    <img src={contact.avatar} alt={contactName} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                                        {contactInitial}
                                    </span>
                                )}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${contactStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold truncate">{contactName}</h3>
                            <p className="text-xs text-gray-500 truncate">
                                {contactStatus === 'online' ? 'Online' : (contactLastSeen ? `Last seen ${formatTime(contactLastSeen)}` : 'Offline')}
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
                    className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-slate-950/25 backdrop-blur-sm ${isDragActive ? 'bg-cyan-700/15' : ''}`}
                >
                    <input {...getInputProps()} />

                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                        </div>
                    ) : (
                        messages.map((message, index) => {
                            const senderId = message.senderId?._id || message.senderId;
                            const isSent = senderId === user._id;

                            return (
                                <div
                                    key={message._id || index}
                                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
                                        {/* File/Image Message */}
                                        {message.messageType !== 'text' && (
                                            <div className="mb-2">
                                                {message.messageType === 'image' && message.fileUrl && (
                                                    <img
                                                        src={message.fileUrl}
                                                        alt="Shared"
                                                        className="max-w-[70vw] sm:max-w-xs rounded-lg cursor-pointer"
                                                        onClick={() => handleOpenImage(message.fileUrl)}
                                                    />
                                                )}
                                                {message.messageType === 'video' && message.fileUrl && (
                                                    <video
                                                        src={message.fileUrl}
                                                        controls
                                                        className="max-w-[70vw] sm:max-w-xs rounded-lg"
                                                    />
                                                )}
                                                {message.messageType === 'document' && (
                                                    <a
                                                        href={message.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 p-2 bg-white/10 rounded"
                                                    >
                                                        <FaFile />
                                                        <span className="text-sm">{message.fileName || 'Document'}</span>
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {/* Text Content */}
                                        {message.content && <p>{message.content}</p>}

                                        {/* Timestamp & Status */}
                                        <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isSent ? 'text-white/70' : 'text-gray-400'}`}>
                                            <span>{formatTime(message.timestamp)}</span>
                                            {isSent && (
                                                <span>
                                                    {message.seen ? <FaCheckDouble className="text-blue-200" /> : <FaCheck />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="message-bubble received">
                                <div className="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-slate-950/45 backdrop-blur-xl border-t border-cyan-200/20">
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
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                            disabled={sending}
                        />

                        <button
                            type="submit"
                            disabled={!messageText.trim() || sending}
                            className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
    );
}

export default Chat;
