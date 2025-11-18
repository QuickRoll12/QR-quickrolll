const User = require('../models/User');
const s3PhotoService = require('../services/s3PhotoService');

class PhotoUploadController {

  /**
   * Get presigned URL for photo upload
   * POST /api/auth/get-photo-upload-url
   */
  async getPhotoUploadUrl(req, res) {
    try {
      const userId = req.user.id;
      const { contentType = 'image/jpeg' } = req.body;

      // Validate user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Validate configuration
      const configValidation = s3PhotoService.validateConfiguration();
      if (!configValidation.isValid) {
        console.error('S3 Photo Service configuration invalid:', configValidation.missing);
        return res.status(500).json({
          success: false,
          message: 'Photo upload service not configured properly'
        });
      }

      // Generate presigned URL using studentId
      const uploadData = await s3PhotoService.generatePresignedUploadUrl(
        user.studentId,
        userId, 
        contentType, 
        300 // 5 minutes expiry
      );

      res.json({
        success: true,
        data: {
          uploadUrl: uploadData.uploadUrl,
          s3Key: uploadData.s3Key,
          contentType: uploadData.contentType,
          expiresIn: uploadData.expiresIn,
          instructions: {
            method: 'PUT',
            headers: {
              'Content-Type': uploadData.contentType
            },
            maxFileSize: '5MB'
          }
        },
        message: 'Presigned URL generated successfully'
      });

    } catch (error) {
      console.error('Error generating photo upload URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate upload URL',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update user photo URL after successful upload
   * POST /api/auth/update-photo-url
   */
  async updatePhotoUrl(req, res) {
    try {
      const userId = req.user.id;
      const { s3Key } = req.body;

      // Validate input
      if (!s3Key) {
        return res.status(400).json({
          success: false,
          message: 'S3 key is required'
        });
      }

      // Get user to validate S3 key format with studentId
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Sanitize studentId for validation (same logic as S3 service)
      const sanitizedStudentId = user.studentId.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Validate S3 key format with studentId
      if (!s3Key.startsWith(`profiles/${sanitizedStudentId}/`)) {
        return res.status(400).json({
          success: false,
          message: `Invalid S3 key format. Expected format: profiles/${sanitizedStudentId}/...`
        });
      }

      // Check if photo exists in S3
      const photoExists = await s3PhotoService.photoExists(s3Key);
      if (!photoExists) {
        return res.status(400).json({
          success: false,
          message: 'Photo not found in storage'
        });
      }

      // Generate CloudFront URL
      const cloudFrontUrl = s3PhotoService.generateCloudFrontUrl(s3Key);

      // Update user record
      user.photo_url = cloudFrontUrl;
      user.passwordChangeRequired = false; // Mark as completed
      user.updatedAt = new Date();
      const updatedUser = await user.save();

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Cleanup old photos (async, don't wait)
      s3PhotoService.cleanupOldPhotos(updatedUser.studentId, s3Key).catch(err => {
        console.error('Error cleaning up old photos:', err);
      });

      res.json({
        success: true,
        data: {
          photo_url: cloudFrontUrl,
          s3Key: s3Key
        },
        message: 'Photo URL updated successfully'
      });

    } catch (error) {
      console.error('Error updating photo URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update photo URL',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get user profile with photo URL
   * GET /api/auth/profile-photo
   */
  async getProfilePhoto(req, res) {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select('name email photo_url passwordChangeRequired');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          photo_url: user.photo_url,
          hasPhoto: !!user.photo_url,
          passwordChangeRequired: user.passwordChangeRequired,
          user: {
            id: user._id,
            name: user.name,
            email: user.email
          }
        }
      });

    } catch (error) {
      console.error('Error fetching profile photo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile photo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete user photo
   * DELETE /api/auth/delete-photo
   */
  async deletePhoto(req, res) {
    try {
      const userId = req.user.id;

      // Update user record to remove photo URL
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          photo_url: null,
          updatedAt: new Date()
        },
        { new: true, select: '-password' }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Cleanup all photos for the user (async)
      s3PhotoService.cleanupOldPhotos(userId, null).catch(err => {
        console.error('Error cleaning up photos:', err);
      });

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            photo_url: null,
            passwordChangeRequired: updatedUser.passwordChangeRequired
          }
        },
        message: 'Photo deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting photo:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete photo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Health check for photo upload service
   * GET /api/auth/photo-service-health
   */
  async checkServiceHealth(req, res) {
    try {
      const configValidation = s3PhotoService.validateConfiguration();
      
      res.json({
        success: true,
        data: {
          serviceStatus: configValidation.isValid ? 'healthy' : 'misconfigured',
          configuration: configValidation.config,
          missingEnvVars: configValidation.missing,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error checking service health:', error);
      res.status(500).json({
        success: false,
        message: 'Service health check failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new PhotoUploadController();
