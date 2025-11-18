const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3 for profile photos with custom environment variables
const s3 = new AWS.S3({
  accessKeyId: process.env.PROFILE_AWS_ACCESS_ID,
  secretAccessKey: process.env.PROFILE_AWS_SECRET_KEY,
  region: process.env.PROFILE_AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.PROFILE_S3_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.PROFILE_CLOUDFRONT_DOMAIN;

class S3PhotoService {
  
  /**
   * Generate S3 key for user profile photo with versioning
   * @param {string} userId - User ID
   * @param {string} fileExtension - File extension (jpg, png, etc.)
   * @returns {string} S3 key
   */
  generateProfilePhotoKey(userId, fileExtension = 'jpg') {
    const timestamp = Date.now();
    return `profiles/${userId}/profile-v${timestamp}.${fileExtension}`;
  }

  /**
   * Generate presigned URL for uploading profile photo
   * @param {string} userId - User ID
   * @param {string} contentType - MIME type (image/jpeg, image/png)
   * @param {number} expiresIn - URL expiry in seconds (default: 5 minutes)
   * @returns {Promise<Object>} Presigned URL and S3 key
   */
  async generatePresignedUploadUrl(userId, contentType = 'image/jpeg', expiresIn = 300) {
    try {
      // Validate content type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(contentType)) {
        throw new Error('Invalid content type. Only JPEG and PNG images are allowed.');
      }

      // Generate S3 key
      const fileExtension = contentType === 'image/png' ? 'png' : 'jpg';
      const s3Key = this.generateProfilePhotoKey(userId, fileExtension);

      // Generate presigned URL
      const uploadUrl = await s3.getSignedUrlPromise('putObject', {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        ContentType: contentType,
        Expires: expiresIn,
        ACL: 'private', // Keep photos private
        Metadata: {
          'user-id': userId,
          'upload-type': 'profile-photo',
          'uploaded-at': new Date().toISOString()
        }
      });

      return {
        uploadUrl,
        s3Key,
        expiresIn,
        contentType
      };
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      throw new Error(`Failed to generate upload URL: ${error.message}`);
    }
  }

  /**
   * Generate CloudFront URL from S3 key
   * @param {string} s3Key - S3 object key
   * @returns {string} CloudFront URL
   */
  generateCloudFrontUrl(s3Key) {
    if (!s3Key) {
      return null;
    }
    
    // Remove leading slash if present
    const cleanKey = s3Key.startsWith('/') ? s3Key.substring(1) : s3Key;
    
    return `https://${CLOUDFRONT_DOMAIN}/${cleanKey}`;
  }

  /**
   * Check if photo exists in S3
   * @param {string} s3Key - S3 object key
   * @returns {Promise<boolean>} True if photo exists
   */
  async photoExists(s3Key) {
    try {
      await s3.headObject({
        Bucket: BUCKET_NAME,
        Key: s3Key
      }).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete old profile photos for a user (keep only the latest)
   * @param {string} userId - User ID
   * @param {string} currentPhotoKey - Current photo key to keep
   * @returns {Promise<void>}
   */
  async cleanupOldPhotos(userId, currentPhotoKey) {
    try {
      // List all photos for the user
      const listParams = {
        Bucket: BUCKET_NAME,
        Prefix: `profiles/${userId}/`
      };

      const objects = await s3.listObjectsV2(listParams).promise();
      
      if (!objects.Contents || objects.Contents.length <= 1) {
        return; // No cleanup needed
      }

      // Delete all photos except the current one
      const objectsToDelete = objects.Contents
        .filter(obj => obj.Key !== currentPhotoKey)
        .map(obj => ({ Key: obj.Key }));

      if (objectsToDelete.length > 0) {
        await s3.deleteObjects({
          Bucket: BUCKET_NAME,
          Delete: {
            Objects: objectsToDelete
          }
        }).promise();

        console.log(`Cleaned up ${objectsToDelete.length} old photos for user ${userId}`);
      }
    } catch (error) {
      console.error('Error cleaning up old photos:', error);
      // Don't throw error - cleanup is not critical
    }
  }

  /**
   * Validate environment variables
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const required = [
      'PROFILE_AWS_ACCESS_ID',
      'PROFILE_AWS_SECRET_KEY', 
      'PROFILE_S3_BUCKET_NAME',
      'PROFILE_CLOUDFRONT_DOMAIN'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    return {
      isValid: missing.length === 0,
      missing,
      config: {
        bucket: BUCKET_NAME,
        cloudfront: CLOUDFRONT_DOMAIN,
        region: process.env.PROFILE_AWS_REGION || 'us-east-1'
      }
    };
  }
}

module.exports = new S3PhotoService();
