const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ProxyMarker = require('../models/ProxyMarker');
const FacultyRequest = require('../models/facultyRequest');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const adminController = require('../controllers/adminController');
const { generatePresignedUploadUrl, generateAdminUploadKey } = require('../config/s3');

// Configure multer for memory storage (for Excel files)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB field size
    fields: 10, // Max 10 fields
    files: 1 // Max 1 file
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files only.'));
    }
  }
});

// Middleware to ensure admin or faculty role
const ensureAdminOrFaculty = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'faculty')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin or faculty privileges required.' });
    }
};

// Get suspicious devices from ProxyMarker collection
router.get('/suspicious-devices', auth, ensureAdminOrFaculty, async (req, res) => {
    try {
        // Group by userId and count occurrences
        const suspiciousDevices = await ProxyMarker.aggregate([
            {
                $group: {
                    _id: {
                        userId: "$userId",
                        name: "$name",
                        course: "$course",
                        section: "$section",
                        classRollNumber: "$classRollNumber"
                    },
                    ipAddresses: { $addToSet: "$ipAddress" },
                    countries: { $addToSet: "$country" },
                    lastSeen: { $max: "$timestamp" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id.userId",
                    name: "$_id.name",
                    course: "$_id.course",
                    section: "$_id.section",
                    classRollNumber: "$_id.classRollNumber",
                    ipAddresses: 1,
                    countries: 1,
                    lastSeen: 1,
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json(suspiciousDevices);
    } catch (error) {
        console.error('Error getting suspicious devices:', error);
        res.status(500).json({ message: 'Server error while fetching suspicious devices' });
    }
});

// Admin login route
router.post('/login', async (req, res) => {
  const { adminId, password } = req.body;
  
  // Check if environment variables are set
  if (!process.env.ADMIN_ID || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ message: 'Server configuration error' });
  }
  // Hard-coded admin credentials (should be stored in environment variables in production)
  if (adminId === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
    const payload = { id: 'admin', role: 'admin' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.json({ success: true, token, user: { role: 'admin' } });
  }
  return res.status(401).json({ message: 'Invalid admin credentials' });
});

// Middleware to ensure admin role
const ensureAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Get all faculty requests - use the controller which generates presigned URLs
router.get('/faculty-requests', ensureAdmin, adminController.getFacultyRequests);

// Approve faculty request - use the controller instead of implementing in the route
router.post('/approve-faculty/:requestId', ensureAdmin, adminController.approveFacultyRequest);

// Reject faculty request - use the controller instead of implementing in the route
router.post('/reject-faculty/:requestId', ensureAdmin, adminController.rejectFacultyRequest);

// Get presigned URL for admin file uploads (Excel/CSV)
router.get('/get-upload-url', ensureAdmin, async (req, res) => {
  try {
    const { fileName, fileType } = req.query;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ message: 'fileName and fileType are required' });
    }
    
    // Validate file type (same validation as multer)
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedMimes.includes(fileType)) {
      return res.status(400).json({ message: 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files only.' });
    }
    
    // Generate unique S3 key for admin uploads (temporary)
    const s3Key = generateAdminUploadKey(fileName);
    
    // Generate presigned URL (5 minutes expiry)
    const uploadUrl = await generatePresignedUploadUrl(s3Key, fileType, 300);
    
    res.json({ 
      uploadUrl, 
      s3Key,
      message: 'Presigned URL generated successfully' 
    });
  } catch (error) {
    console.error('Error generating admin presigned URL:', error);
    res.status(500).json({ message: 'Failed to generate upload URL', error: error.message });
  }
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({ message: 'Too many files. Please upload only one file.' });
            case 'LIMIT_FIELD_COUNT':
                return res.status(400).json({ message: 'Too many fields in the form.' });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({ message: 'Unexpected file field.' });
            default:
                return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};

// Preview student data from Excel file (traditional approach)
router.post('/preview-student-data', ensureAdmin, upload.single('file'), handleMulterError, adminController.previewStudentData);

// Upload and process student data from Excel file (traditional approach)
router.post('/upload-student-data', ensureAdmin, upload.single('file'), handleMulterError, adminController.uploadStudentData);

// NEW S3-only routes (no file upload, just S3 key processing)
router.post('/preview-student-data-s3', ensureAdmin, adminController.previewStudentData);
router.post('/upload-student-data-s3', ensureAdmin, adminController.uploadStudentData);

module.exports = router;