const isSecureContextForPermissions = () => {
    if (window.isSecureContext) return true;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
};

const getGeoPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported in this browser.'));
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 0
        }
    );
});

const getFriendlyPermissionMessage = (err, type) => {
    if (!err) return 'Permission request failed.';

    if (type === 'location') {
        if (err.code === 1) return 'Location permission denied. Allow location and try again.';
        if (err.code === 2) return 'Location unavailable. Turn on location services and try again.';
        if (err.code === 3) return 'Location request timed out. Try again.';
        return 'Unable to get location permission.';
    }

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return 'Microphone/camera permission denied. Allow microphone and camera for this site and try again.';
    }
    if (err.name === 'NotFoundError') {
        return 'Microphone or camera not found. Connect devices and try again.';
    }
    if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        return 'Microphone or camera is busy in another app. Close other apps and try again.';
    }

    return err.message || 'Permission request failed.';
};

const requestMediaWithFallback = async (callType) => {
    const attempts = callType === 'audio'
        ? [{ audio: true, video: false, mode: 'audio-only' }]
        : [
            { audio: true, video: true, mode: 'audio-video' },
            { audio: true, video: false, mode: 'audio-only' }
        ];

    let lastErr = null;
    for (const constraints of attempts) {
        let tempStream = null;
        try {
            tempStream = await navigator.mediaDevices.getUserMedia({
                audio: constraints.audio,
                video: constraints.video
            });

            const hasAudio = tempStream.getAudioTracks().length > 0;
            const hasVideo = tempStream.getVideoTracks().length > 0;
            tempStream.getTracks().forEach((track) => track.stop());

            return {
                granted: true,
                mediaMode: constraints.mode,
                hasAudio,
                hasVideo,
                warning: callType === 'video' && constraints.mode === 'audio-only'
                    ? 'Camera is blocked/unavailable. Call will continue as audio-only.'
                    : ''
            };
        } catch (err) {
            lastErr = err;
        } finally {
            if (tempStream) {
                tempStream.getTracks().forEach((track) => track.stop());
            }
        }
    }

    return {
        granted: false,
        message: getFriendlyPermissionMessage(lastErr, 'media'),
        error: lastErr
    };
};

export const requestCallStartPermissions = async ({ callType = 'audio' } = {}) => {
    if (!isSecureContextForPermissions()) {
        return {
            granted: false,
            message: 'Permissions require HTTPS (or localhost). Open the app in a secure context and retry.'
        };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        return {
            granted: false,
            message: 'This browser does not support microphone/camera permissions.'
        };
    }

    const mediaResult = await requestMediaWithFallback(callType);
    if (!mediaResult.granted) {
        return mediaResult;
    }

    try {
        const location = await getGeoPosition();
        return {
            granted: true,
            mediaMode: mediaResult.mediaMode,
            warning: mediaResult.warning,
            location: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            }
        };
    } catch (err) {
        return {
            granted: false,
            message: getFriendlyPermissionMessage(err, 'location'),
            error: err
        };
    }
};
