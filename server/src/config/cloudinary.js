const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Check if Cloudinary environment variables are set
const cloudName = process.env.CLOUD_NAME;
const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Cloudinary configuration error: Missing environment variables');
  console.error(`CLOUD_NAME: ${cloudName ? 'Set' : 'Missing'}`);
  console.error(`API_KEY: ${apiKey ? 'Set' : 'Missing'}`);
  console.error(`API_SECRET: ${apiSecret ? 'Set' : 'Missing'}`);
}

// Configure Cloudinary
try {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  console.log('Cloudinary configured successfully');
} catch (error) {
  console.error('Error configuring Cloudinary:', error);
}

// Configure storage
let storage;
try {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'faculty-id-cards',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [{ width: 800, height: 600, crop: 'limit' }] // Optional: resize images
    }
  });
  console.log('Cloudinary storage configured successfully');
} catch (error) {
  console.error('Error configuring Cloudinary storage:', error);
  // Fallback to local storage if Cloudinary fails
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads/faculty-id-cards');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  console.log('Fallback to local storage');
}

// Create multer upload middleware with error handling
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

module.exports = {
  cloudinary,
  upload
};