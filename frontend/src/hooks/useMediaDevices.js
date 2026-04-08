import { useCallback, useRef, useState } from 'react';

const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
};

const VIDEO_CONSTRAINTS = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
};

const PERMISSION_ERRORS = new Set(['NotAllowedError', 'PermissionDeniedError', 'SecurityError']);
const DEVICE_NOT_FOUND_ERRORS = new Set(['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError', 'ConstraintNotSatisfiedError']);
const DEVICE_BUSY_ERRORS = new Set(['NotReadableError', 'TrackStartError', 'AbortError']);

const isSecureWebRTCContext = () => {
    if (window.isSecureContext) return true;

    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    return protocol === 'https:';
};

const getBrowserName = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Edg')) return 'edge';
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Chrome')) return 'chrome';
    if (ua.includes('Safari')) return 'safari';
    return 'unknown';
};

const checkMediaPermissions = async () => {
    if (!navigator.permissions || !navigator.permissions.query) {
        return { audio: 'prompt', video: 'prompt' };
    }

    try {
        const [audioPermission, videoPermission] = await Promise.all([
            navigator.permissions.query({ name: 'microphone' }),
            navigator.permissions.query({ name: 'camera' })
        ]);

        return {
            audio: audioPermission.state,
            video: videoPermission.state
        };
    } catch {
        return { audio: 'prompt', video: 'prompt' };
    }
};

const enumerateMediaDevices = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return { audioInputs: [], videoOutputs: [] };
    }

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            audioInputs: devices.filter((d) => d.kind === 'audioinput'),
            videoOutputs: devices.filter((d) => d.kind === 'videoinput')
        };
    } catch {
        return { audioInputs: [], videoOutputs: [] };
    }
};

const getPermissionInstructions = (browser) => {
    const instructions = {
        chrome: 'Settings > Privacy and security > Site settings > Microphone/Camera',
        edge: 'Settings > Cookies and site permissions > Microphone/Camera',
        firefox: 'Preferences > Privacy & Security > Permissions > Microphone/Camera',
        safari: 'Preferences > Websites > Microphone/Camera',
        unknown: 'Browser settings > Privacy > Microphone/Camera permissions'
    };

    return instructions[browser] || instructions.unknown;
};

const normalizeMediaError = (error, callType) => {
    const name = error?.name || 'UnknownError';
    const message = error?.message || 'Unable to access media devices';
    const browser = getBrowserName();
    const settingsPath = getPermissionInstructions(browser);

    if (PERMISSION_ERRORS.has(name)) {
        return {
            code: 'permission_denied',
            name,
            userMessage: callType === 'audio'
                ? `Microphone permission is blocked. Click the lock icon in your address bar, or open ${settingsPath} and allow microphone access for this site.`
                : `Microphone/camera permission is blocked. Click the lock icon in your address bar, or open ${settingsPath} and allow access for this site.`,
            browserInstructions: { settings: settingsPath, browser },
            originalError: error
        };
    }

    if (DEVICE_NOT_FOUND_ERRORS.has(name)) {
        return {
            code: 'device_not_found',
            name,
            userMessage: callType === 'audio'
                ? 'No microphone was found. Connect a microphone and refresh the page.'
                : 'No microphone or camera was found. Connect your devices and refresh the page.',
            originalError: error
        };
    }

    if (DEVICE_BUSY_ERRORS.has(name)) {
        return {
            code: 'device_in_use',
            name,
            userMessage: callType === 'audio'
                ? 'Microphone is already in use by another application. Close apps using your microphone and try again.'
                : 'Camera or microphone is already in use by another application. Close apps using your devices and try again.',
            originalError: error
        };
    }

    return {
        code: 'media_error',
        name,
        userMessage: `${message}. Please check your device settings and try again.`,
        originalError: error
    };
};

const resolveMode = (stream) => {
    const hasAudio = stream.getAudioTracks().length > 0;
    const hasVideo = stream.getVideoTracks().length > 0;
    if (hasAudio && hasVideo) return 'audio-video';
    if (hasAudio) return 'audio-only';
    if (hasVideo) return 'video-only';
    return 'none';
};

const buildAttempts = (callType) => {
    if (callType === 'audio') {
        return [{ audio: AUDIO_CONSTRAINTS, video: false }];
    }

    return [
        { audio: AUDIO_CONSTRAINTS, video: VIDEO_CONSTRAINTS },
        { audio: AUDIO_CONSTRAINTS, video: false },
        { audio: false, video: VIDEO_CONSTRAINTS }
    ];
};

export const mediaDeviceUtils = {
    isSecureWebRTCContext,
    checkMediaPermissions,
    enumerateMediaDevices,
    normalizeMediaError,
    getBrowserName,
    getPermissionInstructions
};

export function useMediaDevices() {
    const streamRef = useRef(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState({ audio: 'prompt', video: 'prompt' });
    const [availableDevices, setAvailableDevices] = useState({ audioInputs: [], videoOutputs: [] });

    const stopCurrentStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const refreshDeviceInfo = useCallback(async () => {
        const [permissions, devices] = await Promise.all([
            checkMediaPermissions(),
            enumerateMediaDevices()
        ]);
        setPermissionStatus(permissions);
        setAvailableDevices(devices);
        return { permissions, devices };
    }, []);

    const requestMedia = useCallback(async ({ callType = 'video' } = {}) => {
        setIsRequesting(true);
        stopCurrentStream();

        try {
            if (!isSecureWebRTCContext()) {
                throw {
                    code: 'insecure_context',
                    name: 'InsecureContextError',
                    userMessage: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? 'For development, use localhost. In production, WebRTC requires HTTPS.'
                        : 'Calls require HTTPS. Open this app over a secure connection.'
                };
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw {
                    code: 'unsupported_browser',
                    name: 'UnsupportedError',
                    userMessage: 'Media device access is not supported in this browser. Use Chrome, Edge, or Firefox.'
                };
            }

            const { permissions, devices } = await refreshDeviceInfo();

            if (callType === 'audio' && devices.audioInputs.length === 0) {
                throw {
                    code: 'device_not_found',
                    name: 'DevicesNotFoundError',
                    userMessage: 'No microphone found. Connect a microphone and refresh the page.'
                };
            }

            let warning = '';
            if (permissions.audio === 'denied') {
                warning = `Microphone permission is blocked in browser settings (${getPermissionInstructions(getBrowserName())}).`;
            }
            if (callType === 'video' && permissions.video === 'denied') {
                warning = warning ? `${warning} Camera permission is also blocked.` : 'Camera permission is blocked in browser settings.';
            }

            const attempts = buildAttempts(callType);
            let lastError = null;

            for (const constraints of attempts) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    const mode = resolveMode(stream);
                    const hasAudio = stream.getAudioTracks().length > 0;
                    const hasVideo = stream.getVideoTracks().length > 0;

                    if (callType !== 'audio' && mode === 'audio-only') {
                        warning = warning ? `${warning} Camera unavailable or blocked. Joined as audio-only.` : 'Camera unavailable or blocked. Joined as audio-only.';
                    } else if (callType !== 'audio' && mode === 'video-only') {
                        warning = warning ? `${warning} Microphone unavailable or blocked. Joined as video-only.` : 'Microphone unavailable or blocked. Joined as video-only.';
                    }

                    streamRef.current = stream;
                    return { stream, mode, hasAudio, hasVideo, warning };
                } catch (error) {
                    const normalized = normalizeMediaError(error, callType);
                    if (normalized.code === 'permission_denied') {
                        throw normalized;
                    }
                    lastError = normalized;
                }
            }

            throw lastError || {
                code: 'media_error',
                userMessage: 'Unable to initialize microphone/camera. Please check your device settings and try again.'
            };
        } finally {
            setIsRequesting(false);
        }
    }, [stopCurrentStream, refreshDeviceInfo]);

    const retryRequest = useCallback((options) => requestMedia(options), [requestMedia]);

    return {
        requestMedia,
        retryRequest,
        stopCurrentStream,
        isRequesting,
        permissionStatus,
        availableDevices,
        refreshDeviceInfo
    };
}

export default useMediaDevices;
