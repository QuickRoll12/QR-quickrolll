const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { promisify } = require('util');
const { cloudinary } = require('../config/cloudinary');
const mkdirAsync = promisify(fs.mkdir);
const unlinkAsync = promisify(fs.unlink);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Configuration
const PHOTO_STORAGE_PATH = process.env.PHOTO_STORAGE_PATH || path.join(__dirname, '../../temp-photos');
const PHOTO_RETENTION_HOURS = process.env.PHOTO_RETENTION_HOURS || 24; // Default 24 hours
const MAX_PHOTO_SIZE_KB = process.env.MAX_PHOTO_SIZE_KB || 500; // Default 500KB after compression
const CLOUDINARY_FOLDER = 'attendance-photos';

// Ensure the storage directory exists (for fallback)
const initializeStorage = async () => {
  try {
    if (!fs.existsSync(PHOTO_STORAGE_PATH)) {
      await mkdirAsync(PHOTO_STORAGE_PATH, { recursive: true });
      console.log(`Created photo storage directory at ${PHOTO_STORAGE_PATH}`);
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize photo storage directory:', error);
    return false;
  }
};

// Generate a unique filename for the photo
const generatePhotoFilename = (department, semester, section, studentId) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(4).toString('hex');
  return `${department}_${semester}_${section}_${studentId}_${timestamp}_${randomString}`;
};

// Process and save the photo to Cloudinary
const savePhoto = async (photoData, department, semester, section, studentId) => {
  try {
    // Remove the data:image/jpeg;base64, part if present
    const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Process the image - resize and compress
    const processedImageBuffer = await sharp(buffer)
      .resize(640, 480, { fit: 'inside' }) // Resize to reasonable dimensions
      .jpeg({ quality: 80 }) // Compress with 80% quality
      .toBuffer();
    
    // Check if the processed image is within size limits
    if (processedImageBuffer.length > MAX_PHOTO_SIZE_KB * 1024) {
      throw new Error(`Photo exceeds maximum size of ${MAX_PHOTO_SIZE_KB}KB after compression`);
    }
    
    // Generate unique filename
    const filename = generatePhotoFilename(department, semester, section, studentId);
    
    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: CLOUDINARY_FOLDER,
          public_id: filename,
          resource_type: 'image',
          overwrite: true,
          invalidate: true
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(processedImageBuffer);
    });
    
    return {
      filename: filename,
      cloudinaryId: uploadResult.public_id,
      cloudinaryUrl: uploadResult.secure_url,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error saving photo to Cloudinary:', error);
    
    // Fallback to local storage if Cloudinary fails
    try {
      await initializeStorage();
      const filename = generatePhotoFilename(department, semester, section, studentId) + '.jpg';
      const filePath = path.join(PHOTO_STORAGE_PATH, filename);
      
      // Remove the data:image/jpeg;base64, part if present
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Process the image - resize and compress
      const processedImageBuffer = await sharp(buffer)
        .resize(640, 480, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      await fs.promises.writeFile(filePath, processedImageBuffer);
      
      return {
        filename: filename,
        filePath: filePath,
        timestamp: Date.now(),
        isLocalStorage: true
      };
    } catch (fallbackError) {
      throw new Error(`Failed to save photo: ${error.message}`);
    }
  }
};

// Get a photo by filename/ID
const getPhoto = async (identifier) => {
  try {
    // Check if this is a Cloudinary ID
    if (identifier.includes('/')) {
      // This is a Cloudinary public_id
      const result = await cloudinary.api.resource(identifier);
      return {
        cloudinaryUrl: result.secure_url,
        data: null // No need to return data for Cloudinary URLs
      };
    }
    
    // Try to get from Cloudinary first
    try {
      const publicId = `${CLOUDINARY_FOLDER}/${identifier}`;
      const result = await cloudinary.api.resource(publicId);
      return {
        cloudinaryUrl: result.secure_url,
        data: null
      };
    } catch (cloudinaryError) {
      console.log('Photo not found in Cloudinary, checking local storage');
      
      // Fallback to local storage
      const filePath = path.join(PHOTO_STORAGE_PATH, identifier);
      if (!fs.existsSync(filePath)) {
        throw new Error('Photo not found in Cloudinary or local storage');
      }
      
      return {
        filePath,
        data: await fs.promises.readFile(filePath),
        isLocalStorage: true
      };
    }
  } catch (error) {
    console.error('Error retrieving photo:', error);
    throw new Error(`Failed to retrieve photo: ${error.message}`);
  }
};

// Delete a specific photo
const deletePhoto = async (identifier) => {
  try {
    // Check if this is a Cloudinary ID
    if (identifier.includes('/')) {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(identifier);
      return true;
    }
    
    // Try to delete from Cloudinary first
    try {
      const publicId = `${CLOUDINARY_FOLDER}/${identifier}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudinaryError) {
      console.log(`Photo not found in Cloudinary or failed to delete: ${cloudinaryError.message}`);
    }
    
    // Also check local storage
    const filePath = path.join(PHOTO_STORAGE_PATH, identifier);
    if (fs.existsSync(filePath)) {
      await unlinkAsync(filePath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting photo:', error);
    return false;
  }
};

// Delete all photos for a specific session
const deleteSessionPhotos = async (department, semester, section) => {
  try {
    const sessionPrefix = `${department}_${semester}_${section}_`;
    // Delete from Cloudinary
    let deletedCount = 0;
    
    try {
      // First, get all resources in the folder
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: `${CLOUDINARY_FOLDER}/${sessionPrefix}`,
        max_results: 500
      });
      
      // Delete each resource
      for (const resource of result.resources) {
        await cloudinary.uploader.destroy(resource.public_id);
        deletedCount++;
      }
      
      console.log(`Deleted ${deletedCount} photos from Cloudinary for session ${department}-${semester}-${section}`);
    } catch (cloudinaryError) {
      console.error('Error deleting session photos from Cloudinary:', cloudinaryError);
    }
    
    // Also clean up local storage as fallback
    try {
      const files = await readdirAsync(PHOTO_STORAGE_PATH);
      let localDeletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith(sessionPrefix)) {
          const filePath = path.join(PHOTO_STORAGE_PATH, file);
          await unlinkAsync(filePath);
          localDeletedCount++;
        }
      }
      deletedCount += localDeletedCount;
    } catch (localError) {
      console.error('Error deleting session photos from local storage:', localError);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error deleting session photos:', error);
    return 0;
  }
};

// Cleanup old photos based on retention policy
const cleanupOldPhotos = async () => {
  try {
    let deletedCount = 0;
    
    // Clean up Cloudinary
    try {
      const retentionDate = new Date();
      retentionDate.setHours(retentionDate.getHours() - PHOTO_RETENTION_HOURS);
      
      // Convert to Unix timestamp (seconds)
      const timestamp = Math.floor(retentionDate.getTime() / 1000);
      
      // Search for resources older than retention period
      const result = await cloudinary.search
        .expression(`folder:${CLOUDINARY_FOLDER} AND uploaded_at<${timestamp}`)
        .max_results(500)
        .execute();
      
      // Delete each resource
      for (const resource of result.resources) {
        await cloudinary.uploader.destroy(resource.public_id);
        deletedCount++;
      }
    } catch (cloudinaryError) {
      console.error('Error cleaning up old photos from Cloudinary:', cloudinaryError);
    }
    
    // Also clean up local storage
    try {
      const files = await readdirAsync(PHOTO_STORAGE_PATH);
      const now = Date.now();
      const retentionMs = PHOTO_RETENTION_HOURS * 60 * 60 * 1000;
      
      for (const file of files) {
        const filePath = path.join(PHOTO_STORAGE_PATH, file);
        const stats = await statAsync(filePath);
        const fileAge = now - stats.mtimeMs;
        
        if (fileAge > retentionMs) {
          await unlinkAsync(filePath);
          deletedCount++;
        }
      }
    } catch (localError) {
      console.error('Error cleaning up old photos from local storage:', localError);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error during photo cleanup:', error);
    return 0;
  }
};

// Verify a photo against a reference photo (if available)
const verifyPhoto = async (photoFilename, referencePhotoUrl = null) => {
  // In a real implementation, this would use facial recognition to compare photos
  // For this implementation, we'll simply verify that the photo exists
  try {
    // Try to get the photo from Cloudinary or local storage
    try {
      await getPhoto(photoFilename);
    } catch (error) {
      return {
        verified: false,
        reason: 'Photo not found'
      };
    }
    
    // For now, we'll consider all photos as verified
    // In a production system, you would implement actual facial recognition here
    return {
      verified: true,
      confidence: 1.0 // Confidence score (1.0 = 100%)
    };
  } catch (error) {
    console.error('Error verifying photo:', error);
    return {
      verified: false,
      reason: error.message || 'Unknown error during verification'
    };
  }
};

// Schedule regular cleanup - Only master process
const scheduleCleanup = () => {
  const cluster = require('cluster');
  if (!cluster.isWorker) {
    // Run cleanup every 6 hours
    const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
    setInterval(cleanupOldPhotos, CLEANUP_INTERVAL_MS);
    console.log('🧹 Scheduled regular photo cleanup (master process only)');
  }
};

// Initialize storage and schedule cleanup on module load
(async () => {
  await initializeStorage();
  scheduleCleanup();
})();

module.exports = {
  savePhoto,
  getPhoto,
  deletePhoto,
  deleteSessionPhotos,
  cleanupOldPhotos,
  verifyPhoto
};
