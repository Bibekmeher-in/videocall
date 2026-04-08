const express = require('express');
const router = express.Router();
const {
    uploadImage,
    uploadVideo,
    uploadFile,
    uploadAvatar,
    deleteFile
} = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');
const { uploadImage: uploadImageMulter, uploadVideo: uploadVideoMulter, uploadDocument: uploadDocumentMulter, uploadAvatar: uploadAvatarMulter } = require('../middleware/uploadMiddleware');

router.post('/image', protect, uploadImageMulter.single('image'), uploadImage);
router.post('/video', protect, uploadVideoMulter.single('video'), uploadVideo);
router.post('/file', protect, uploadDocumentMulter.single('file'), uploadFile);
router.post('/avatar', protect, uploadAvatarMulter.single('avatar'), uploadAvatar);
router.delete('/:filename', protect, deleteFile);

module.exports = router;
