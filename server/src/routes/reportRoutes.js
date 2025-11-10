const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reportService = require('../services/reportService');
const reportEmailService = require('../services/reportEmailService');
const attendanceService = require('../services/attendanceService');
const reportController = require('../controllers/reportController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 📊 Configure multer for CSV file uploads
const upload = multer({
    dest: path.join(__dirname, '../../temp/uploads/'),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Ensure temp upload directory exists
const uploadDir = path.join(__dirname, '../../temp/uploads/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * 📊 @route POST /api/reports/generate-custom
 * @desc Generate custom attendance reports from CSV upload (Python script logic)
 * @access Private (Faculty only)
 */
router.post('/generate-custom', auth, upload.single('csvFile'), async (req, res) => {
    await reportController.generateCustomReport(req, res);
});

/**
 * @route POST /api/reports/generate
 * @desc Generate an attendance report for a specific session
 * @access Private (Faculty only)
 */
router.post('/generate', auth, async (req, res) => {
    try {
        // Ensure the user is a faculty member
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Faculty only.' 
            });
        }

        const { department, semester, section, totalStudents, presentStudents, absentees } = req.body;

        // Validate required fields
        if (!department || !semester || !section || !totalStudents || 
            !Array.isArray(presentStudents) || !Array.isArray(absentees)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Prepare session data for report generation
        const sessionData = {
            department,
            semester,
            section,
            totalStudents,
            presentStudents,
            absentees,
            date: new Date()
        };

        // Get faculty data from the authenticated user
        const facultyData = {
            name: req.user.name || 'Faculty',
            email: req.user.email || process.env.EMAIL_USER || 'faculty@example.com'
        };

        // Generate PDF report
        const reportFilePath = await reportService.generateAttendanceReport(sessionData, facultyData);

        // Return success response with the file path
        res.status(200).json({
            success: true,
            message: 'Report generated successfully',
            filePath: reportFilePath
        });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            message: `Failed to generate report: ${error.message}`
        });
    }
});

/**
 * @route POST /api/reports/email
 * @desc Email an attendance report to the faculty
 * @access Private (Faculty only)
 */
router.post('/email', auth, async (req, res) => {
    try {
        // Ensure the user is a faculty member
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Faculty only.' 
            });
        }

        const { department, semester, section, totalStudents, presentCount, absentCount, reportFilePath } = req.body;

        // Validate required fields
        if (!department || !semester || !section || !totalStudents || !reportFilePath) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Get faculty email from the authenticated user
        const facultyEmail = req.user.email || process.env.EMAIL_USER || 'faculty@example.com';

        // Send email with the report
        const emailResult = await reportEmailService.sendAttendanceReport({
            to: facultyEmail,
            subject: `Attendance Report - ${department} ${semester} ${section}`,
            department,
            semester,
            section,
            totalStudents,
            presentCount,
            absentCount,
            date: new Date().toLocaleDateString(),
            attachmentPath: reportFilePath
        });

        // Clean up the temporary file after sending
        reportService.cleanupTempFile(reportFilePath);

        if (emailResult.success) {
            res.status(200).json({
                success: true,
                message: `Report sent to ${facultyEmail}`
            });
        } else {
            res.status(500).json({
                success: false,
                message: emailResult.message
            });
        }
    } catch (error) {
        console.error('Error sending report email:', error);
        res.status(500).json({
            success: false,
            message: `Failed to send report email: ${error.message}`
        });
    }
});

/**
 * @route GET /api/reports/download/:filename
 * @desc Download a generated report file
 * @access Private (Faculty only)
 */
router.get('/download/:filename', auth, (req, res) => {
    try {
        // Ensure the user is a faculty member
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Faculty only.' 
            });
        }

        const { filename } = req.params;
        const filePath = path.join(os.tmpdir(), filename);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Report file not found'
            });
        }

        // Set headers for file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Stream the file to the response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Clean up the file after download
        fileStream.on('end', () => {
            reportService.cleanupTempFile(filePath);
        });
    } catch (error) {
        console.error('Error downloading report:', error);
        res.status(500).json({
            success: false,
            message: `Failed to download report: ${error.message}`
        });
    }
});

/**
 * @route GET /api/reports/active-sessions
 * @desc Get all active attendance sessions
 * @access Private (Faculty only)
 */
router.get('/active-sessions', auth, (req, res) => {
    try {
        // Ensure the user is a faculty member
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Faculty only.' 
            });
        }

        // Get all active sessions from the attendance service
        const activeSessions = attendanceService.getAllActiveSessions();

        res.status(200).json({
            success: true,
            sessions: activeSessions
        });
    } catch (error) {
        console.error('Error getting active sessions:', error);
        res.status(500).json({
            success: false,
            message: `Failed to get active sessions: ${error.message}`
        });
    }
});

module.exports = router;