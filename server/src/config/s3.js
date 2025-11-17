const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create S3 instance
const s3 = new AWS.S3();

// S3 bucket name from environment
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Generate presigned URL for uploading files to S3
 * @param {string} key - S3 object key (file path)
 * @param {string} contentType - MIME type of the file
 * @param {number} expires - URL expiration time in seconds (default: 300 = 5 minutes)
 * @returns {Promise<string>} - Presigned URL for uploading
 */
const generatePresignedUploadUrl = (key, contentType, expires = 300) => {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Expires: expires,
      ACL: 'private' // Files are private by default
    };

    s3.getSignedUrl('putObject', params, (error, url) => {
      if (error) {
        console.error('Error generating presigned URL:', error);
        reject(error);
      } else {
        resolve(url);
      }
    });
  });
};

/**
 * Download file from S3
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<Buffer>} - File buffer
 */
const downloadFile = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    const result = await s3.getObject(params).promise();
    return result.Body;
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    throw error;
  }
};

/**
 * Delete file from S3
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<void>}
 */
const deleteFile = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
    console.log(`Successfully deleted file: ${key}`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

/**
 * Check if file exists in S3
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<boolean>}
 */
const fileExists = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    console.error('Error checking file existence:', error);
    throw error;
  }
};

/**
 * Generate S3 URL for accessing uploaded files
 * @param {string} key - S3 object key (file path)
 * @returns {string} - Public S3 URL
 */
const getFileUrl = (key) => {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
};

/**
 * Generate unique S3 key for faculty request photos
 * @param {string} originalName - Original filename
 * @returns {string} - Unique S3 key
 */
const generateFacultyPhotoKey = (originalName) => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `faculty-requests/${timestamp}_${randomSuffix}.${extension}`;
};

/**
 * Generate unique S3 key for admin uploads (temporary files)
 * @param {string} originalName - Original filename
 * @returns {string} - Unique S3 key
 */
const generateAdminUploadKey = (originalName) => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `admin-uploads/${timestamp}_${randomSuffix}.${extension}`;
};

module.exports = {
  s3,
  BUCKET_NAME,
  generatePresignedUploadUrl,
  downloadFile,
  deleteFile,
  fileExists,
  getFileUrl,
  generateFacultyPhotoKey,
  generateAdminUploadKey
};
