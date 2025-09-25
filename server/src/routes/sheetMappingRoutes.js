const express = require('express');
const router = express.Router();
const sheetMappingController = require('../controllers/sheetMappingController');
const auth = require('../middleware/auth');

// All routes require authentication and faculty role
router.use(auth);

// Middleware to check if user is faculty
const isFaculty = (req, res, next) => {
  if (req.user.role !== 'faculty') {
    return res.status(403).json({ message: 'Access denied. Faculty only.' });
  }
  next();
};

// Apply faculty check to all routes
router.use(isFaculty);

// Create a new sheet mapping
router.post('/', sheetMappingController.createSheetMapping);

// Get all sheet mappings
router.get('/', sheetMappingController.getAllSheetMappings);

// Get sheet mapping by department, semester, and section
router.get('/:department/:semester/:section', sheetMappingController.getSheetMapping);

// Update a sheet mapping
router.put('/:department/:semester/:section', sheetMappingController.updateSheetMapping);

// Delete a sheet mapping
router.delete('/:department/:semester/:section', sheetMappingController.deleteSheetMapping);

module.exports = router;