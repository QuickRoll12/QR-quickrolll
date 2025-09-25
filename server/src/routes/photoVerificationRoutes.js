const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const photoVerificationService = require('../services/photoVerificationService');
const Attendance = require('../models/Attendance');
const AttendanceRecord = require('../models/AttendanceRecord');
const fs = require('fs');

// Upload photo for attendance verification
router.post('/upload', auth, async (req, res) => {
  try {
    const { photoData, department, semester, section } = req.body;
    
    if (!photoData || !department || !semester || !section) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Get student ID from authenticated user
    const studentId = req.user.rollNumber || req.user._id;
    
    // Save the photo
    const photoInfo = await photoVerificationService.savePhoto(
      photoData,
      department,
      semester,
      section,
      studentId
    );
    
    // Return success with photo information
    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      photoInfo: {
        filename: photoInfo.filename,
        timestamp: photoInfo.timestamp
      }
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload photo' 
    });
  }
});

// Get photo for verification (faculty access only)
router.get('/:filename', auth, async (req, res) => {
  try {
    // Check if user is faculty or admin
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    const { filename } = req.params;
    const photo = await photoVerificationService.getPhoto(filename);
    
    // Set content type and send the image
    res.set('Content-Type', 'image/jpeg');
    res.send(photo.data);
  } catch (error) {
    console.error('Error retrieving photo:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Photo not found'
    });
  }
});

// Update attendance record with photo information (internal use)
router.put('/update-attendance', auth, async (req, res) => {
  try {
    const { attendanceId, photoFilename } = req.body;
    
    if (!attendanceId || !photoFilename) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Update the attendance record with photo information
    const updatedAttendance = await AttendanceRecord.findByIdAndUpdate(
      attendanceId,
      {
        $set: {
          photoFilename: photoFilename,
          photoVerified: true,
          photoTimestamp: Date.now()
        }
      },
      { new: true }
    );
    
    if (!updatedAttendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Attendance record updated with photo information',
      attendance: updatedAttendance
    });
  } catch (error) {
    console.error('Error updating attendance with photo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update attendance record'
    });
  }
});

// Delete photos for a session (faculty access only)
router.delete('/session', auth, async (req, res) => {
  try {
    // Check if user is faculty or admin
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    const { department, semester, section } = req.body;
    
    if (!department || !semester || !section) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Delete all photos for the session
    const deletedCount = await photoVerificationService.deleteSessionPhotos(
      department,
      semester,
      section
    );
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} photos for session ${department}-${semester}-${section}`
    });
  } catch (error) {
    console.error('Error deleting session photos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete session photos'
    });
  }
});

// Add a route to manually clean up session photos
router.delete('/cleanup/:department/:semester/:section', auth, async (req, res) => {
    try {
        // Only faculty can trigger manual cleanup
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ success: false, message: 'Only faculty members can clean up session photos' });
        }
        
        const { department, semester, section } = req.params;
        
        console.log(`Manual cleanup requested for ${department}-${semester}-${section}`);
        
        const deletedCount = await photoVerificationService.deleteSessionPhotos(
            department,
            semester,
            section
        );
        
        return res.json({ 
            success: true, 
            message: `Successfully cleaned up ${deletedCount} photos for session ${department}-${semester}-${section}` 
        });
    } catch (error) {
        console.error('Error in manual photo cleanup:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;