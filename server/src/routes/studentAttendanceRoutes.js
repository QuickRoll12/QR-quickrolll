const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AttendanceRecord = require('../models/AttendanceRecord');

// Middleware to ensure the user is a student
const ensureStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied. Student role required.' });
  }
  next();
};

/**
 * @route   GET /api/student/attendance/summary
 * @desc    Get attendance summary grouped by faculty
 * @access  Private (Students only)
 */
router.get('/summary', auth, ensureStudent, async (req, res) => {
  try {
    const { semester, section, classRollNumber, universityRollNumber } = req.user;
    
    // Find all attendance records for this student's semester and section
    const attendanceRecords = await AttendanceRecord.find({
      semester,
      section,
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ date: -1 });

    // Group records by faculty
    const facultyMap = new Map();
    
    attendanceRecords.forEach(record => {
      const { facultyId, facultyName, date } = record;
      
      // Check if student was present
      const isPresent = record.presentStudents.some(id => 
        id === classRollNumber || id === universityRollNumber
      );
      
      // If faculty not in map, initialize
      if (!facultyMap.has(facultyId)) {
        facultyMap.set(facultyId, {
          facultyId,
          facultyName,
          totalDays: 0,
          presentDays: 0,
          attendancePercentage: 0,
          lastDate: date
        });
      }
      
      // Update faculty stats
      const facultyStats = facultyMap.get(facultyId);
      facultyStats.totalDays += 1;
      if (isPresent) {
        facultyStats.presentDays += 1;
      }
      facultyStats.attendancePercentage = Math.round((facultyStats.presentDays / facultyStats.totalDays) * 100);
      
      // Update last date if this record is more recent
      if (date > facultyStats.lastDate) {
        facultyStats.lastDate = date;
      }
    });
    
    // Convert map to array and sort by faculty name
    const summary = Array.from(facultyMap.values())
      .sort((a, b) => a.facultyName.localeCompare(b.facultyName));
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching student attendance summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/student/attendance/details/:facultyId
 * @desc    Get detailed attendance for a specific faculty
 * @access  Private (Students only)
 */
router.get('/details/:facultyId', auth, ensureStudent, async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { semester, section, classRollNumber, universityRollNumber } = req.user;
    
    // Find all attendance records for this faculty and student's semester/section in the last 30 days
    const attendanceRecords = await AttendanceRecord.find({
      facultyId,
      semester,
      section,
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ date: 1 }); // Sort by date ascending
    
    // Process records to determine if student was present or absent
    const attendanceDetails = attendanceRecords.map(record => {
      const isPresent = record.presentStudents.some(id => 
        id === classRollNumber || id === universityRollNumber
      );
      
      return {
        date: record.date,
        formattedDate: new Date(record.date).toLocaleDateString('en-IN'),
        status: isPresent ? 'present' : 'absent',
        facultyName: record.facultyName
      };
    });
    
    res.json({
      facultyName: attendanceRecords.length > 0 ? attendanceRecords[0].facultyName : '',
      attendanceDetails
    });
  } catch (error) {
    console.error('Error fetching student attendance details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;