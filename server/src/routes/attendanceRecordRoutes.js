const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const attendanceRecordService = require('../services/attendanceRecordService');
const reportService = require('../services/reportService'); // Added reportService
const fs = require('fs'); // Added fs module

// Middleware to ensure faculty role
const ensureFaculty = (req, res, next) => {
  if (req.user && req.user.role === 'faculty') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Faculty privileges required.' });
  }
};

// Middleware to ensure faculty can only access their own records
const ensureOwnAttendance = async (req, res, next) => {
  try {
    const record = await attendanceRecordService.getAttendanceRecord(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Check if the faculty ID matches the logged-in user
    if (record.facultyId !== req.user.facultyId) {
      return res.status(403).json({ message: 'Unauthorized access to this attendance record' });
    }
    
    // Attach record to request for later use
    req.attendanceRecord = record;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Middleware to handle token in query parameter
const handleQueryToken = (req, res, next) => {
  // Check if token is in query parameter
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
};

// Get all attendance records for the logged-in faculty
router.get('/records', auth, ensureFaculty, async (req, res) => {
  try {
    const { facultyId } = req.user;
    const { date, department, section } = req.query;
    
    // Build filters object
    const filters = {};
    if (date) filters.date = date;
    if (department) filters.department = department;
    if (section) filters.section = section;
    
    const records = await attendanceRecordService.getFacultyAttendanceRecords(
      facultyId,
      filters,
      30 // Limit to last 30 records
    );
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new attendance record
router.post('/records', auth, ensureFaculty, async (req, res) => {
  try {
    const { 
      department, 
      semester, 
      section, 
      totalStudents, 
      presentStudents, 
      absentees,
      sessionType
    } = req.body;
    
    // Validate required fields
    if (!department || !semester || !section || !totalStudents) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }
    
    // Prepare session data
    const sessionData = {
      department,
      semester,
      section,
      totalStudents,
      presentStudents: presentStudents || [],
      absentees: absentees || [],
      sessionType: sessionType || 'roll'
    };
    
    // Prepare faculty data from the authenticated user
    const facultyData = {
      facultyId: req.user.facultyId,
      name: req.user.name,
      email: req.user.email
    };
    
    // Create the attendance record
    const record = await attendanceRecordService.saveAttendanceRecord(
      sessionData,
      facultyData
    );
    
    res.status(201).json({ 
      success: true,
      message: 'Attendance record created successfully',
      _id: record._id
    });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Update an existing attendance record
router.put('/records/:id', auth, ensureFaculty, async (req, res) => {
  try {
    const { id } = req.params;
    const { presentStudents, absentees, presentCount } = req.body;
    
    // Validate required fields
    if (!presentStudents || !absentees) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields for attendance update' 
      });
    }
    
    // Get the record to ensure it belongs to this faculty
    const record = await attendanceRecordService.getAttendanceRecord(id);
    
    if (!record) {
      return res.status(404).json({ 
        success: false,
        message: 'Attendance record not found' 
      });
    }
    
    // Ensure the faculty can only edit their own records
    if (record.facultyId !== req.user.facultyId) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to edit this attendance record' 
      });
    }
    
    // Update the record
    const updatedRecord = await attendanceRecordService.updateAttendanceRecord(
      id,
      {
        presentStudents,
        absentees,
        presentCount: presentCount || presentStudents.length
      }
    );
    
    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      record: updatedRecord
    });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get a specific attendance record
router.get('/records/:id', auth, ensureFaculty, ensureOwnAttendance, async (req, res) => {
  try {
    // Record is already attached to request by middleware
    res.json(req.attendanceRecord);
  } catch (error) {
    console.error('Error fetching attendance record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate and download PDF for an attendance record
router.get('/records/:id/generate-pdf', auth, ensureFaculty, ensureOwnAttendance, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if PDF already exists
    if (req.attendanceRecord.pdfUrl) {
      // Increment download count
      await attendanceRecordService.incrementDownloadCount(id);
      
      // Return existing PDF URL
      return res.json({ 
        success: true, 
        pdfUrl: req.attendanceRecord.pdfUrl,
        message: 'PDF already exists'
      });
    }
    
    // Generate and upload PDF
    const updatedRecord = await attendanceRecordService.generateAndUploadPDF(id);
    
    res.json({ 
      success: true, 
      pdfUrl: updatedRecord.pdfUrl,
      message: 'PDF generated successfully'
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating PDF', 
      error: error.message 
    });
  }
});

// Direct PDF download endpoint - returns the actual PDF file
router.get('/records/:id/download-pdf', handleQueryToken, auth, ensureFaculty, ensureOwnAttendance, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prepare session data for PDF generation
    const sessionData = {
      department: req.attendanceRecord.department,
      semester: req.attendanceRecord.semester,
      section: req.attendanceRecord.section,
      totalStudents: req.attendanceRecord.totalStudents,
      presentStudents: req.attendanceRecord.presentStudents,
      absentees: req.attendanceRecord.absentees,
      date: req.attendanceRecord.date,
      sessionType: req.attendanceRecord.sessionType
    };

    // Prepare faculty data for PDF generation
    const facultyData = {
      name: req.attendanceRecord.facultyName,
      email: req.attendanceRecord.facultyEmail
    };

    // Generate PDF using existing report service
    const pdfPath = await reportService.generateAttendanceReport(sessionData, facultyData);
    
    // Increment download count
    await attendanceRecordService.incrementDownloadCount(id);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${sessionData.department}_${sessionData.section}_${new Date(sessionData.date).toISOString().split('T')[0]}.pdf`);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
    
    // Clean up the file after sending
    fileStream.on('end', () => {
      reportService.cleanupTempFile(pdfPath);
    });
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error downloading PDF', 
      error: error.message 
    });
  }
});

// Generate section-wise report for attendance record
router.post('/records/:id/section-report', auth, ensureFaculty, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the attendance record
    const record = await attendanceRecordService.getAttendanceRecord(id);
    
    if (!record) {
      return res.status(404).json({ 
        success: false,
        message: 'Attendance record not found' 
      });
    }
    
    // Ensure the faculty can only access their own records
    if (record.facultyId !== req.user.facultyId) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to access this attendance record' 
      });
    }
    
    // Import section report service
    const sectionReportService = require('../services/sectionReportService');
    
    // Process the attendance data
    const result = await sectionReportService.processAttendanceReport(
      record.section, // Section name for CSV lookup (e.g., "DSA")
      record.presentStudents || [], // Present roll numbers
      record.absentees || [] // Absent roll numbers
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Section-wise report generated successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
  } catch (error) {
    console.error('Error generating section report:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while generating section report', 
      error: error.message 
    });
  }
});

// Move student between present and absent in attendance record
router.post('/records/:id/move-student', auth, ensureFaculty, async (req, res) => {
  try {
    const { id } = req.params;
    const { givenRollNumber, fromStatus, toStatus } = req.body;
    
    // Validate input
    if (!givenRollNumber || !fromStatus || !toStatus) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: givenRollNumber, fromStatus, toStatus'
      });
    }
    
    if (!['present', 'absent'].includes(fromStatus) || !['present', 'absent'].includes(toStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "present" or "absent"'
      });
    }
    
    if (fromStatus === toStatus) {
      return res.status(400).json({
        success: false,
        message: 'fromStatus and toStatus cannot be the same'
      });
    }
    
    // Get the attendance record
    const record = await attendanceRecordService.getAttendanceRecord(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    // Ensure the faculty can only modify their own records
    if (record.facultyId !== req.user.facultyId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to modify this attendance record'
      });
    }
    
    // Convert givenRollNumber to string for consistent comparison
    const rollNumberStr = givenRollNumber.toString();
    
    // Get current arrays
    let presentStudents = record.presentStudents || [];
    let absentees = record.absentees || [];
    
    // Check if student exists in the expected source array
    if (fromStatus === 'present') {
      if (!presentStudents.includes(rollNumberStr)) {
        return res.status(400).json({
          success: false,
          message: `Student with roll number ${rollNumberStr} is not in present list`
        });
      }
      // Remove from present, add to absent
      presentStudents = presentStudents.filter(roll => roll !== rollNumberStr);
      if (!absentees.includes(rollNumberStr)) {
        absentees.push(rollNumberStr);
      }
    } else {
      if (!absentees.includes(rollNumberStr)) {
        return res.status(400).json({
          success: false,
          message: `Student with roll number ${rollNumberStr} is not in absent list`
        });
      }
      // Remove from absent, add to present
      absentees = absentees.filter(roll => roll !== rollNumberStr);
      if (!presentStudents.includes(rollNumberStr)) {
        presentStudents.push(rollNumberStr);
      }
    }
    
    // Sort the arrays for consistency
    presentStudents.sort((a, b) => parseInt(a) - parseInt(b));
    absentees.sort((a, b) => parseInt(a) - parseInt(b));
    
    // Update the record
    const updatedRecord = await attendanceRecordService.updateAttendanceRecord(id, {
      presentStudents,
      absentees,
      presentCount: presentStudents.length
    });
    
    res.json({
      success: true,
      message: `Student ${rollNumberStr} moved from ${fromStatus} to ${toStatus}`,
      data: {
        presentCount: presentStudents.length,
        absentCount: absentees.length,
        presentStudents,
        absentees
      }
    });
    
  } catch (error) {
    console.error('Error moving student:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while moving student',
      error: error.message
    });
  }
});

module.exports = router;