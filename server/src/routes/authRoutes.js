const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { handleUpload } = require('../middleware/uploadMiddleware');
const { generatePresignedUploadUrl, generateFacultyPhotoKey } = require('../config/s3');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-code', authController.verifyCode);
router.post('/reset-password', authController.resetPassword);
router.post('/reset-faculty-password', authController.resetFacultyPassword);

// NEW: Get presigned URL for faculty photo upload
router.get('/get-upload-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.query;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ message: 'fileName and fileType are required' });
    }
    
    // Validate file type (same validation as before)
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif'];
    if (!validTypes.includes(fileType)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPG, JPEG, PNG, HEIC, HEIF are allowed.' });
    }
    
    // Generate unique S3 key
    const s3Key = generateFacultyPhotoKey(fileName);
    
    // Generate presigned URL (5 minutes expiry)
    const uploadUrl = await generatePresignedUploadUrl(s3Key, fileType, 300);
    
    res.json({ 
      uploadUrl, 
      s3Key,
      message: 'Presigned URL generated successfully' 
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ message: 'Failed to generate upload URL', error: error.message });
  }
});

// Keep existing route for backward compatibility (will be updated to handle S3)
router.post('/faculty-request', handleUpload, authController.facultyRequest);

// NEW S3-only route (no file upload, just S3 key processing)
router.post('/faculty-request-s3', authController.facultyRequest);

module.exports = router;