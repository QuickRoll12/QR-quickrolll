const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const photoUploadController = require('../controllers/photoUploadController');

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

// ==================== PHOTO UPLOAD ROUTES ====================

/**
 * @route   POST /api/auth/get-photo-upload-url
 * @desc    Get presigned URL for uploading profile photo
 * @access  Private (Authenticated users only)
 * @body    { contentType: "image/jpeg" } (optional)
 */
router.post('/get-photo-upload-url', auth, ensureAuthenticated, photoUploadController.getPhotoUploadUrl);

/**
 * @route   POST /api/auth/update-photo-url
 * @desc    Update user photo URL after successful S3 upload
 * @access  Private (Authenticated users only)
 * @body    { s3Key: "profiles/user123/profile-v1234567890.jpg" }
 */
router.post('/update-photo-url', auth, ensureAuthenticated, photoUploadController.updatePhotoUrl);

/**
 * @route   GET /api/auth/profile-photo
 * @desc    Get user profile photo information
 * @access  Private (Authenticated users only)
 */
router.get('/profile-photo', auth, ensureAuthenticated, photoUploadController.getProfilePhoto);

/**
 * @route   DELETE /api/auth/delete-photo
 * @desc    Delete user profile photo
 * @access  Private (Authenticated users only)
 */
router.delete('/delete-photo', auth, ensureAuthenticated, photoUploadController.deletePhoto);

/**
 * @route   GET /api/auth/photo-service-health
 * @desc    Check photo upload service health and configuration
 * @access  Private (Authenticated users only)
 */
router.get('/photo-service-health', auth, ensureAuthenticated, photoUploadController.checkServiceHealth);

// ==================== ERROR HANDLING ====================

// Handle 404 for photo upload routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Photo upload endpoint not found',
    availableEndpoints: [
      'POST /api/auth/get-photo-upload-url',
      'POST /api/auth/update-photo-url',
      'GET /api/auth/profile-photo',
      'DELETE /api/auth/delete-photo',
      'GET /api/auth/photo-service-health'
    ]
  });
});

module.exports = router;
