import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useCallStore } from '../context/store';
import { callAPI } from '../services/api';
import socketService from '../socket/socket';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaDesktop } from 'react-icons/fa';
import Peer from 'simple-peer/simplepeer.min.js';
import { useMediaDevices } from '../hooks/useMediaDevices';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

const normalizeUserId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
        if (typeof value.toString === 'function') return String(value.toString());
    }
    return String(value);
};

function CallInterface() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const {
        callStatus,
        callAcceptedAt,
        setCallStatus,
        setCallAcceptedAt,
        isMuted,
        toggleMute,
        isVideoOff,
        toggleVideo,
        isScreenSharing,
        toggleScreenShare,
        resetCall
    } = useCallStore();

    const [call, setCall] = useState(null);
    const [duration, setDuration] = useState(0);
    const [participants, setParticipants] = useState([]);
    const [initError, setInitError] = useState('');
    const [initWarning, setInitWarning] = useState('');
    const [endMessage, setEndMessage] = useState('');
    const [hasLocalVideoTrack, setHasLocalVideoTrack] = useState(true);
    const [activeRemotePeerId, setActiveRemotePeerId] = useState('');

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const localStreamRef = useRef(null);
    const peersRef = useRef(new Map());
    const pendingSignalsRef = useRef(new Map());
    const remoteStreamsRef = useRef(new Map());
    const remoteAudioElementsRef = useRef(new Map());
    const peerRetryRef = useRef(new Map());
    const remotePeerIdRef = useRef(null);
    const isInitiatorRef = useRef(false);
    const isGroupCallRef = useRef(false);
    const currentUserIdRef = useRef('');
    const initializingRef = useRef(false);
    const endingRef = useRef(false);
    const endTimeoutRef = useRef(null);
    const { requestMedia, retryRequest, stopCurrentStream, isRequesting } = useMediaDevices();

    const getPostCallRoute = useCallback(() => {
        const searchParams = new URLSearchParams(location.search);
        const isGroupCall = searchParams.get('group') === 'true' || Boolean(call?.isGroupCall);
        if (isGroupCall) {
            const groupId = searchParams.get('groupId') || normalizeUserId(call?.groupId?._id || call?.groupId);
            if (groupId) {
                return `/group/${groupId}`;
            }
            return '/home';
        }

        const currentUserId = normalizeUserId(user?._id);
        const callerId = normalizeUserId(call?.callerId?._id || call?.callerId);
        const calleeId = normalizeUserId(call?.calleeId?._id || call?.calleeId);
        const contactId = callerId === currentUserId ? calleeId : callerId;
        return contactId ? `/chat/${contactId}` : '/home';
    }, [call, location.search, user?._id]);

    useEffect(() => {
        if (!roomId || !user?._id) {
            return;
        }
        initializeCall();
    }, [roomId, user?._id]);

    useEffect(() => {
        return () => {
            if (endTimeoutRef.current) {
                clearTimeout(endTimeoutRef.current);
            }
            cleanup();
        };
    }, []);

    useEffect(() => {
        if (callStatus === 'connected' && !callAcceptedAt) {
            setCallAcceptedAt(Date.now());
        }
    }, [callStatus, callAcceptedAt, setCallAcceptedAt]);

    useEffect(() => {
        let interval;
        if (callStatus === 'connected' && callAcceptedAt) {
            const tick = () => {
                const elapsedSeconds = Math.max(0, Math.floor((Date.now() - callAcceptedAt) / 1000));
                setDuration(elapsedSeconds);
            };
            tick();
            interval = setInterval(tick, 1000);
        }
        return () => clearInterval(interval);
    }, [callStatus, callAcceptedAt]);

    useEffect(() => {
        // Listen for WebRTC signals
        const handleSignal = (event) => {
            const { from, signal } = event.detail;
            const fromUserId = normalizeUserId(from);
            const expectedRemoteUserId = normalizeUserId(remotePeerIdRef.current);

            if (!fromUserId) {
                return;
            }

            if (!isGroupCallRef.current && expectedRemoteUserId && fromUserId !== expectedRemoteUserId) {
                return;
            }

            const existingPeer = peersRef.current.get(fromUserId);
            if (existingPeer) {
                existingPeer.signal(signal);
                return;
            }

            const queue = pendingSignalsRef.current.get(fromUserId) || [];
            queue.push(signal);
            pendingSignalsRef.current.set(fromUserId, queue);

            if (localStreamRef.current && callStatus === 'connected') {
                createPeer(false, localStreamRef.current, fromUserId);
            }
        };

        const handleUserJoined = (event) => {
            const { userId, userName, userAvatar } = event.detail;
            const normalizedUserId = normalizeUserId(userId);
            if (!normalizedUserId || normalizedUserId === currentUserIdRef.current) {
                return;
            }

            setParticipants(prev => {
                if (prev.some((participant) => normalizeUserId(participant.userId) === normalizedUserId)) {
                    return prev;
                }
                return [...prev, { userId: normalizedUserId, userName, userAvatar }];
            });

            if (
                callStatus === 'connected' &&
                isGroupCallRef.current &&
                localStreamRef.current &&
                !peersRef.current.has(normalizedUserId)
            ) {
                createPeer(true, localStreamRef.current, normalizedUserId);
            }
        };

        const handleUserLeft = (event) => {
            const { userId } = event.detail;
            const normalizedUserId = normalizeUserId(userId);
            setParticipants(prev => prev.filter(p => normalizeUserId(p.userId) !== normalizedUserId));

            const peer = peersRef.current.get(normalizedUserId);
            if (peer) {
                peer.destroy();
                peersRef.current.delete(normalizedUserId);
            }
            pendingSignalsRef.current.delete(normalizedUserId);
            remoteStreamsRef.current.delete(normalizedUserId);

            const audioElement = remoteAudioElementsRef.current.get(normalizedUserId);
            if (audioElement) {
                audioElement.srcObject = null;
                audioElement.remove();
                remoteAudioElementsRef.current.delete(normalizedUserId);
            }

            if (activeRemotePeerId === normalizedUserId) {
                const nextRemotePeerId = remoteStreamsRef.current.keys().next().value || '';
                setActiveRemotePeerId(nextRemotePeerId);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = nextRemotePeerId ? remoteStreamsRef.current.get(nextRemotePeerId) : null;
                }
            }
        };

        const handleRoomParticipants = (event) => {
            const { roomId: eventRoomId, participants: existingParticipants } = event.detail;
            if (eventRoomId !== roomId || !Array.isArray(existingParticipants)) {
                return;
            }

            const normalizedParticipants = existingParticipants
                .map((participantId) => normalizeUserId(participantId))
                .filter((participantId) => participantId && participantId !== currentUserIdRef.current);

            if (normalizedParticipants.length === 0) {
                return;
            }

            setParticipants((prev) => {
                const nextParticipants = [...prev];
                normalizedParticipants.forEach((participantId) => {
                    const exists = nextParticipants.some((participant) => normalizeUserId(participant.userId) === participantId);
                    if (!exists) {
                        nextParticipants.push({ userId: participantId, userName: 'Participant' });
                    }
                });
                return nextParticipants;
            });

            if (!localStreamRef.current || callStatus !== 'connected') {
                return;
            }

            normalizedParticipants.forEach((participantId) => {
                if (!peersRef.current.has(participantId)) {
                    createPeer(false, localStreamRef.current, participantId);
                }
            });
        };

        const handleCallAccepted = (event) => {
            const acceptedRoomId = event?.detail?.roomId;
            const acceptedAt = event?.detail?.acceptedAt;
            if (acceptedRoomId !== roomId) {
                return;
            }
            setCallAcceptedAt(acceptedAt || Date.now());
            setCallStatus('connected');
        };

        const handleRemoteCallEnded = (event) => {
            const endedRoomId = event?.detail?.roomId;
            const endedBy = event?.detail?.endedBy;
            if (endedRoomId !== roomId) {
                return;
            }

            if (endingRef.current) {
                return;
            }
            endingRef.current = true;
            setCallStatus('ended');
            setEndMessage(normalizeUserId(endedBy) === normalizeUserId(user?._id) ? 'Call Ended by You' : 'Call Ended by User');
            cleanup(false);
            endTimeoutRef.current = setTimeout(() => {
                resetCall();
                navigate(getPostCallRoute(), { replace: true });
            }, 1500);
        };

        window.addEventListener('webrtc_signal', handleSignal);
        window.addEventListener('user_joined_call', handleUserJoined);
        window.addEventListener('user_left_call', handleUserLeft);
        window.addEventListener('call_room_participants', handleRoomParticipants);
        window.addEventListener('call_accepted', handleCallAccepted);
        window.addEventListener('remote_call_ended', handleRemoteCallEnded);

        return () => {
            window.removeEventListener('webrtc_signal', handleSignal);
            window.removeEventListener('user_joined_call', handleUserJoined);
            window.removeEventListener('user_left_call', handleUserLeft);
            window.removeEventListener('call_room_participants', handleRoomParticipants);
            window.removeEventListener('call_accepted', handleCallAccepted);
            window.removeEventListener('remote_call_ended', handleRemoteCallEnded);
        };
    }, [activeRemotePeerId, roomId, callStatus, setCallAcceptedAt, setCallStatus, resetCall, navigate, user?._id, getPostCallRoute]);

    const createPeer = useCallback((initiator, stream, remoteUserId) => {
        const normalizedRemoteUserId = normalizeUserId(remoteUserId);
        if (!normalizedRemoteUserId || peersRef.current.has(normalizedRemoteUserId)) {
            return;
        }

        const peer = new Peer({
            initiator,
            trickle: false,
            stream,
            config: ICE_SERVERS
        });

        peer.on('signal', (signal) => {
            if (normalizedRemoteUserId) {
                socketService.sendWebRTCSignal(normalizedRemoteUserId, signal);
            }
        });

        peer.on('stream', (remoteStream) => {
            remoteStream.getAudioTracks().forEach((track) => {
                track.enabled = true;
            });
            remoteStreamsRef.current.set(normalizedRemoteUserId, remoteStream);

            if (remoteVideoRef.current) {
                const shouldSetActiveStream = !activeRemotePeerId || activeRemotePeerId === normalizedRemoteUserId;
                if (shouldSetActiveStream) {
                    setActiveRemotePeerId(normalizedRemoteUserId);
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play?.().catch(() => { });
                }
            }

            if (!remoteAudioElementsRef.current.has(normalizedRemoteUserId)) {
                const audioElement = document.createElement('audio');
                audioElement.autoplay = true;
                audioElement.playsInline = true;
                audioElement.className = 'hidden';
                audioElement.dataset.remotePeerId = normalizedRemoteUserId;
                document.body.appendChild(audioElement);
                remoteAudioElementsRef.current.set(normalizedRemoteUserId, audioElement);
            }

            const audioElement = remoteAudioElementsRef.current.get(normalizedRemoteUserId);
            if (audioElement) {
                audioElement.muted = false;
                audioElement.volume = 1;
                audioElement.srcObject = remoteStream;
                audioElement.play?.().catch(() => { });
            }

            if (remoteAudioRef.current && !remoteAudioRef.current.srcObject) {
                remoteAudioRef.current.muted = false;
                remoteAudioRef.current.volume = 1;
                remoteAudioRef.current.srcObject = remoteStream;
                remoteAudioRef.current.play?.().catch(() => { });
            }
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);

            const message = err?.message || '';
            const isDataChannelMidRejection =
                err?.name === 'OperationError' &&
                message.includes('Rejected data channel transport');

            if (isDataChannelMidRejection) {
                const retryCount = peerRetryRef.current.get(normalizedRemoteUserId) || 0;
                if (retryCount < 1 && localStreamRef.current) {
                    peerRetryRef.current.set(normalizedRemoteUserId, retryCount + 1);
                    setInitWarning('Reconnecting media session...');
                    peer.destroy();
                    createPeer(false, localStreamRef.current, normalizedRemoteUserId);
                    return;
                }
            }

            setInitError('Call connection lost. Please retry.');
            setCallStatus('ended');
        });

        peer.on('close', () => {
            peersRef.current.delete(normalizedRemoteUserId);
            pendingSignalsRef.current.delete(normalizedRemoteUserId);
            remoteStreamsRef.current.delete(normalizedRemoteUserId);
            peerRetryRef.current.delete(normalizedRemoteUserId);

            const audioElement = remoteAudioElementsRef.current.get(normalizedRemoteUserId);
            if (audioElement) {
                audioElement.srcObject = null;
                audioElement.remove();
                remoteAudioElementsRef.current.delete(normalizedRemoteUserId);
            }
        });

        peersRef.current.set(normalizedRemoteUserId, peer);

        const queuedSignals = pendingSignalsRef.current.get(normalizedRemoteUserId) || [];
        if (queuedSignals.length > 0) {
            queuedSignals.forEach((queuedSignal) => peer.signal(queuedSignal));
            pendingSignalsRef.current.delete(normalizedRemoteUserId);
        }
    }, [activeRemotePeerId, setCallStatus]);

    useEffect(() => {
        if (callStatus !== 'connected' || !localStreamRef.current || isGroupCallRef.current) {
            return;
        }

        const remoteUserId = normalizeUserId(remotePeerIdRef.current);
        if (!remoteUserId || peersRef.current.has(remoteUserId)) {
            return;
        }

        createPeer(isInitiatorRef.current, localStreamRef.current, remoteUserId);
    }, [callStatus, createPeer]);

    const initializeCall = useCallback(async (isRetry = false) => {
        if (initializingRef.current) {
            return;
        }
        initializingRef.current = true;

        try {
            setInitError('');
            setInitWarning('');

            if (isRetry) {
                cleanup(false);
            }
            setDuration(0);
            setEndMessage('');
            endingRef.current = false;
            if (callStatus !== 'connected') {
                setCallAcceptedAt(null);
            }

            // Get call details
            const { data: callData } = await callAPI.getCallByRoomId(roomId);
            if (!callData || !callData._id) {
                throw {
                    code: 'call_not_found',
                    userMessage: 'Call session not found or has expired. Start a new call and try again.'
                };
            }
            setCall(callData);

            const callerId = normalizeUserId(callData?.callerId?._id || callData?.callerId);
            const calleeId = normalizeUserId(callData?.calleeId?._id || callData?.calleeId);
            const currentUserId = normalizeUserId(user?._id);
            currentUserIdRef.current = currentUserId;
            const isInitiator = callerId === currentUserId;
            isInitiatorRef.current = isInitiator;
            const remoteUserId = isInitiator ? calleeId : callerId;
            const isGroupCallRoute = new URLSearchParams(location.search).get('group') === 'true';
            const isGroupCall = Boolean(callData?.isGroupCall || isGroupCallRoute);
            isGroupCallRef.current = isGroupCall;
            if (callStatus === 'idle') {
                setCallStatus('ringing');
            }
            if (!remoteUserId && !isGroupCall) {
                throw {
                    code: 'remote_user_not_found',
                    userMessage: 'Could not identify the other participant for this call.'
                };
            }
            remotePeerIdRef.current = remoteUserId;

            const queryType = new URLSearchParams(location.search).get('type');
            const effectiveCallType = queryType || callData?.callType || 'video';

            const mediaResult = await (isRetry
                ? retryRequest({ callType: effectiveCallType })
                : requestMedia({ callType: effectiveCallType }));
            const { stream, hasVideo, warning } = mediaResult;

            localStreamRef.current = stream;
            setHasLocalVideoTrack(hasVideo);
            setInitWarning(warning || '');

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Join call room
            socketService.joinCallRoom(roomId);
            if (callData?._id) {
                callAPI.joinCall(callData._id).catch(() => { });
            }
            if (isGroupCall) {
                setInitWarning('Waiting for another participant to join the call...');
            }
        } catch (error) {
            const fallbackMessage = 'Unable to start this call. Please verify device permissions and retry.';
            const serverMessage = error?.response?.data?.message;
            const statusCode = error?.response?.status;
            const resolvedMessage = error?.userMessage || serverMessage || error?.message || fallbackMessage;
            const knownMediaPermissionError =
                error?.name === 'NotAllowedError' ||
                error?.name === 'PermissionDeniedError' ||
                error?.name === 'SecurityError' ||
                error?.code === 'permission_denied';

            const knownMediaDeviceError =
                error?.name === 'NotFoundError' ||
                error?.name === 'OverconstrainedError' ||
                error?.name === 'NotReadableError' ||
                error?.name === 'AbortError' ||
                error?.code === 'device_not_found' ||
                error?.code === 'device_in_use';

            const knownInsecureError =
                error?.code === 'insecure_context' ||
                error?.name === 'InsecureContextError';

            const knownCallNotFoundError =
                error?.code === 'call_not_found' ||
                statusCode === 404;

            const knownAuthorizationError =
                statusCode === 401 || statusCode === 403;

            if (knownInsecureError) {
                setInitError(error?.userMessage || 'Calls require HTTPS. Please use a secure connection.');
            } else if (knownMediaPermissionError) {
                setInitError(error?.userMessage || 'Microphone/camera permission is blocked. Allow access in browser site settings and OS privacy settings, then retry.');
            } else if (knownMediaDeviceError) {
                setInitError(error?.userMessage || 'Microphone/camera is unavailable or busy. Close other apps using your devices and retry.');
            } else if (knownCallNotFoundError) {
                setInitError(resolvedMessage || 'Call session not found or has expired. Start a new call and try again.');
            } else if (knownAuthorizationError) {
                setInitError('You are not authorized for this call. Please sign in again and retry.');
            } else {
                setInitError(resolvedMessage);
            }

            console.error('Call initialization error:', error);
            setCallStatus('ended');
        } finally {
            initializingRef.current = false;
        }
    }, [roomId, location.search, user?._id, requestMedia, retryRequest, setCallAcceptedAt, callStatus, setCallStatus]);

    const handleEndCall = async () => {
        try {
            if (call?._id) {
                await callAPI.endCall(call._id);
            }
        } catch (error) {
            console.error('Error ending call:', error);
        }
        socketService.endCall(remotePeerIdRef.current, roomId);
    };

    const cleanup = (resetStore = true) => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }
        peersRef.current.forEach((peer) => peer.destroy());
        peersRef.current.clear();
        pendingSignalsRef.current.clear();
        remoteStreamsRef.current.forEach((stream) => {
            stream.getTracks().forEach((track) => track.stop());
        });
        remoteStreamsRef.current.clear();
        remoteAudioElementsRef.current.forEach((audioElement) => {
            audioElement.srcObject = null;
            audioElement.remove();
        });
        remoteAudioElementsRef.current.clear();
        peerRetryRef.current.clear();
        remotePeerIdRef.current = null;
        isGroupCallRef.current = false;
        currentUserIdRef.current = '';
        setActiveRemotePeerId('');
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        stopCurrentStream();
        localStreamRef.current = null;
        socketService.leaveCallRoom(roomId);
        if (resetStore) {
            resetCall();
        }
    };

    const toggleMuteAudio = () => {
        const audioTracks = localStreamRef.current?.getAudioTracks?.() || [];
        if (audioTracks.length === 0) {
            setInitWarning('No microphone track is active for this call.');
            return;
        }

        if (localStreamRef.current) {
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
        }
        toggleMute();
    };

    const toggleVideoStream = () => {
        const videoTracks = localStreamRef.current?.getVideoTracks?.() || [];
        if (videoTracks.length === 0) {
            setInitWarning('No camera track is active for this call.');
            return;
        }

        if (localStreamRef.current) {
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
        }
        toggleVideo();
    };

    const startScreenShare = async () => {
        try {
            if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) {
                setInitWarning('Screen sharing requires HTTPS and browser support.');
                return;
            }

            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });

            const videoTrack = screenStream.getVideoTracks()[0];
            peersRef.current.forEach((peer) => {
                const sender = peer?._pc?.getSenders().find((s) => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            videoTrack.onended = () => {
                stopScreenShare();
            };

            toggleScreenShare();
        } catch (error) {
            console.error('Screen share error:', error);
        }
    };

    const stopScreenShare = async () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                peersRef.current.forEach((peer) => {
                    const sender = peer?._pc?.getSenders().find((s) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
            }
        }
        toggleScreenShare();
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="call-screen">
            {endMessage && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55">
                    <div className="px-5 py-3 rounded-lg bg-slate-900 border border-slate-700">
                        <p className="text-white font-medium">{endMessage}</p>
                    </div>
                </div>
            )}
            {/* Remote Video */}
            <div className="flex-1 relative bg-slate-800">
                {initError ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center max-w-md px-6">
                            <p className="text-white text-lg font-semibold mb-2">Call initialization failed</p>
                            <p className="text-gray-300 text-sm mb-6">{initError}</p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => initializeCall(true)}
                                    disabled={isRequesting}
                                    className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                                >
                                    {isRequesting ? 'Retrying...' : 'Retry'}
                                </button>
                                <button
                                    onClick={() => navigate(-1)}
                                    className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                ) : callStatus === 'connected' ? (
                    <>
                        {initWarning && (
                            <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full z-10 max-w-[90vw]">
                                <span className="text-white text-xs sm:text-sm block truncate">{initWarning}</span>
                            </div>
                        )}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

                        {/* Call Duration */}
                        <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                            <span className="text-white text-sm sm:text-base">{formatDuration(duration)}</span>
                        </div>

                        {/* Participants */}
                        {participants.length > 0 && (
                            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-black/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                                <span className="text-white text-xs sm:text-sm">{participants.length + 1} participants</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary-500 flex items-center justify-center animate-pulse">
                                <FaVideo className="w-10 h-10 text-white" />
                            </div>
                            <p className="text-white text-lg">Connecting...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Local Video (Picture in Picture) */}
            <div className="absolute bottom-24 right-3 sm:right-4 w-28 h-20 sm:w-40 sm:h-28 md:w-48 md:h-36 rounded-xl overflow-hidden shadow-lg border-2 border-slate-700">
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
                {(isVideoOff || !hasLocalVideoTrack) && (
                    <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                                {user?.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Call Controls */}
            <div className="absolute bottom-0 left-0 right-0 py-4 sm:py-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                    <button
                        onClick={toggleMuteAudio}
                        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500' : 'bg-slate-700'
                            } hover:bg-slate-600`}
                    >
                        {isMuted ? (
                            <FaMicrophoneSlash className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        ) : (
                            <FaMicrophone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        )}
                    </button>

                    <button
                        onClick={toggleVideoStream}
                        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500' : 'bg-slate-700'
                            } hover:bg-slate-600`}
                    >
                        {isVideoOff ? (
                            <FaVideoSlash className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        ) : (
                            <FaVideo className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        )}
                    </button>

                    <button
                        onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors ${isScreenSharing ? 'bg-primary-500' : 'bg-slate-700'
                            } hover:bg-slate-600`}
                    >
                        <FaDesktop className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>

                    <button
                        onClick={handleEndCall}
                        className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                    >
                        <FaPhoneSlash className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CallInterface;
