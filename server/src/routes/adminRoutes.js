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

// Configure multer for memory storage (for Excel files)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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

// Get all faculty requests
router.get('/faculty-requests', ensureAdmin, async (req, res) => {
  try {
    const requests = await FacultyRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching faculty requests' });
  }
});

// Approve faculty request - use the controller instead of implementing in the route
router.post('/approve-faculty/:requestId', ensureAdmin, adminController.approveFacultyRequest);

// Reject faculty request - use the controller instead of implementing in the route
router.post('/reject-faculty/:requestId', ensureAdmin, adminController.rejectFacultyRequest);

// Preview student data from Excel file
router.post('/preview-student-data', ensureAdmin, upload.single('file'), adminController.previewStudentData);

// Upload and process student data from Excel file
router.post('/upload-student-data', ensureAdmin, upload.single('file'), adminController.uploadStudentData);

module.exports = router;