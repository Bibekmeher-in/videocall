const MB = 1024 * 1024;

export const IMAGE_UPLOAD_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif'
];

export const VIDEO_UPLOAD_MIME_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
];

export const DOCUMENT_UPLOAD_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
];

export const MESSAGE_UPLOAD_ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/avif': ['.avif'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/ogg': ['.ogg'],
    'video/quicktime': ['.mov'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar']
};

export const STORY_UPLOAD_ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/avif': ['.avif'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/quicktime': ['.mov']
};

export const AVATAR_UPLOAD_ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/avif': ['.avif']
};

const acceptObjectToString = (acceptObject) =>
    Object.values(acceptObject).flat().join(',');

export const MESSAGE_UPLOAD_ACCEPT_STRING = acceptObjectToString(MESSAGE_UPLOAD_ACCEPT);
export const AVATAR_UPLOAD_ACCEPT_STRING = acceptObjectToString(AVATAR_UPLOAD_ACCEPT);

const IMAGE_TYPE_LABEL = 'JPEG, PNG, GIF, WebP, or AVIF';
const VIDEO_TYPE_LABEL = 'MP4, WebM, OGG, or MOV';
const DOCUMENT_TYPE_LABEL = 'PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, or RAR';

const validateByRule = (file, { allowedMimeTypes, maxSize, typeLabel, fileLabel }) => {
    if (!file) {
        return {
            isValid: false,
            errorMessage: 'No file selected.'
        };
    }

    if (!allowedMimeTypes.includes(file.type)) {
        return {
            isValid: false,
            errorMessage: `${fileLabel} must be ${typeLabel}.`
        };
    }

    if (file.size > maxSize) {
        return {
            isValid: false,
            errorMessage: `${fileLabel} must be ${Math.round(maxSize / MB)}MB or smaller.`
        };
    }

    return { isValid: true };
};

export const validateMessageUpload = (file) => {
    if (!file) {
        return {
            isValid: false,
            errorMessage: 'No file selected.'
        };
    }

    if (file.type.startsWith('image/')) {
        const result = validateByRule(file, {
            allowedMimeTypes: IMAGE_UPLOAD_MIME_TYPES,
            maxSize: 10 * MB,
            typeLabel: IMAGE_TYPE_LABEL,
            fileLabel: 'Images'
        });

        return {
            ...result,
            uploadKind: 'image',
            messageType: 'image'
        };
    }

    if (file.type.startsWith('video/')) {
        const result = validateByRule(file, {
            allowedMimeTypes: VIDEO_UPLOAD_MIME_TYPES,
            maxSize: 50 * MB,
            typeLabel: VIDEO_TYPE_LABEL,
            fileLabel: 'Videos'
        });

        return {
            ...result,
            uploadKind: 'video',
            messageType: 'video'
        };
    }

    const result = validateByRule(file, {
        allowedMimeTypes: DOCUMENT_UPLOAD_MIME_TYPES,
        maxSize: 25 * MB,
        typeLabel: DOCUMENT_TYPE_LABEL,
        fileLabel: 'Documents'
    });

    return {
        ...result,
        uploadKind: 'file',
        messageType: 'document'
    };
};

export const validateStoryUpload = (file) => {
    if (!file) {
        return {
            isValid: false,
            errorMessage: 'No file selected.'
        };
    }

    if (file.type.startsWith('video/')) {
        return {
            ...validateByRule(file, {
                allowedMimeTypes: VIDEO_UPLOAD_MIME_TYPES.filter((type) => type !== 'video/ogg'),
                maxSize: 50 * MB,
                typeLabel: 'MP4, WebM, or MOV',
                fileLabel: 'Story videos'
            }),
            uploadKind: 'video',
            mediaType: 'video'
        };
    }

    return {
        ...validateByRule(file, {
            allowedMimeTypes: IMAGE_UPLOAD_MIME_TYPES,
            maxSize: 10 * MB,
            typeLabel: IMAGE_TYPE_LABEL,
            fileLabel: 'Story images'
        }),
        uploadKind: 'image',
        mediaType: 'image'
    };
};

export const validateAvatarUpload = (file) =>
    validateByRule(file, {
        allowedMimeTypes: IMAGE_UPLOAD_MIME_TYPES,
        maxSize: 5 * MB,
        typeLabel: IMAGE_TYPE_LABEL,
        fileLabel: 'Avatar images'
    });

export const getUploadErrorMessage = (error, fallbackMessage) =>
    error?.response?.data?.message || error?.userMessage || error?.message || fallbackMessage;
