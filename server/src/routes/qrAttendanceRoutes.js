const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const qrSessionService = require('../services/qrSessionService');
const qrTokenService = require('../services/qrTokenService');

// Middleware to ensure faculty role
const ensureFaculty = (req, res, next) => {
    if (req.user && req.user.role === 'faculty') {
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Access denied. Faculty privileges required.' 
        });
    }
};

// Middleware to ensure student role
const ensureStudent = (req, res, next) => {
    if (req.user && req.user.role === 'student') {
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Access denied. Student privileges required.' 
        });
    }
};

// ==================== FACULTY ROUTES ====================

/**
 * @route   POST /api/qr-attendance/start-session
 * @desc    Start a new QR attendance session (Faculty clicks "Start Session")
 * @access  Private (Faculty only)
 */
router.post('/start-session', auth, ensureFaculty, async (req, res) => {
    try {
        const { department, semester, section, totalStudents, sessionType = 'roll' } = req.body;

        // Validate required fields
        if (!department || !semester || !section || !totalStudents) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: department, semester, section, totalStudents'
            });
        }

        if (isNaN(totalStudents) || totalStudents < 1) {
            return res.status(400).json({
                success: false,
                message: 'Total students must be a valid positive number'
            });
        }

        const facultyData = {
            facultyId: req.user.facultyId,
            name: req.user.name,
            email: req.user.email
        };

        const sessionData = {
            department,
            semester,
            section,
            totalStudents: parseInt(totalStudents),
            sessionType
        };

        const result = await qrSessionService.startSession(sessionData, facultyData);

        res.json(result);

    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to start session'
        });
    }
});

/**
 * @route   POST /api/qr-attendance/lock-session
 * @desc    Lock a session (Faculty clicks "Lock Session")
 * @access  Private (Faculty only)
 */
router.post('/lock-session', auth, ensureFaculty, async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const result = await qrSessionService.lockSession(sessionId, req.user.facultyId);

        res.json(result);

    } catch (error) {
        console.error('Lock session error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to lock session'
        });
    }
});

/**
 * @route   POST /api/qr-attendance/start-attendance
 * @desc    Start QR attendance (Faculty clicks "Start Attendance")
 * @access  Private (Faculty only)
 */
router.post('/start-attendance', auth, ensureFaculty, async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const result = await qrSessionService.startAttendance(sessionId, req.user.facultyId);

        res.json(result);

    } catch (error) {
        console.error('Start attendance error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to start attendance'
        });
    }
});

/**
 * @route   POST /api/qr-attendance/end-session
 * @desc    End a QR attendance session
 * @access  Private (Faculty only)
 */
router.post('/end-session', auth, ensureFaculty, async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const result = await qrSessionService.endSession(sessionId, req.user.facultyId);

        res.json(result);

    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to end session'
        });
    }
});

/**
 * @route   GET /api/qr-attendance/faculty-dashboard
 * @desc    Get faculty dashboard data with active sessions
 * @access  Private (Faculty only)
 */
router.get('/faculty-dashboard', auth, ensureFaculty, async (req, res) => {
    try {
        const dashboardData = await qrSessionService.getFacultyDashboardData(req.user.facultyId);

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Faculty dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
});

/**
 * @route   GET /api/qr-attendance/session/:sessionId
 * @desc    Get detailed session information
 * @access  Private (Faculty only)
 */
router.get('/session/:sessionId/stats', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await qrSessionService.getSessionById(sessionId);

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Verify faculty owns this session
        if (session.facultyId !== req.user.facultyId) {
            return res.status(403).json({ message: 'Unauthorized access to this session' });
        }

        const stats = {
            totalPresent: session.studentsPresentCount,
            presentPercentage: session.totalStudents > 0 ? 
                Math.round((session.studentsPresentCount / session.totalStudents) * 100) : 0,
        };

        res.json(stats);

    } catch (error) {
        console.error('Error fetching session stats:', error);
        res.status(500).json({ message: 'Failed to fetch session stats' });
    }
});

// /**
//  * @route   GET /api/qr-attendance/session/:sessionId/stats
//  * @desc    Get live attendance stats for a specific session
//  * @access  Private (Faculty only)
//  */
// router.get('/session/:sessionId/stats', auth, ensureFaculty, async (req, res) => {
//     try {
//         const { sessionId } = req.params;
//         const session = await qrSessionService.getSessionById(sessionId);

//         if (!session) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Session not found'
//             });
//         }

//         // Ensure the faculty owns this session
//         if (session.facultyId !== req.user.facultyId) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'Unauthorized access to this session'
//             });
//         }

//         const totalStudents = session.totalStudents || 0;
//         const studentsPresent = session.studentsPresent || [];
//         const totalPresent = studentsPresent.length;
//         const presentPercentage = totalStudents > 0 
//             ? Math.round((totalPresent / totalStudents) * 100) 
//             : 0;
        
//         // This is the exact structure the frontend expects
//         const stats = {
//             studentsPresent: studentsPresent,
//             totalPresent: totalPresent,
//             presentPercentage: presentPercentage,
//             totalJoined: session.studentsJoined?.length || 0 // Good to send this too
//         };

//         res.json(stats);

//     } catch (error) {
//         console.error('Get session stats error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Failed to fetch session stats'
//         });
//     }
// });

// ==================== STUDENT ROUTES ====================

/**
 * @route   GET /api/qr-attendance/session-status
 * @desc    Get session status for student's section
 * @access  Private (Student only)
 */
router.get('/session-status', auth, ensureStudent, async (req, res) => {
    try {
        const student = req.user;
        const status = await qrSessionService.getSessionStatus(
            student.course,
            student.semester,
            student.section,
            student.studentId
        );

        res.json({
            success: true,
            ...status
        });

    } catch (error) {
        console.error('Session status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch session status'
        });
    }
});

/**
 * @route   POST /api/qr-attendance/join-session
 * @desc    Student joins an active session
 * @access  Private (Student only)
 */
router.post('/join-session', auth, ensureStudent, async (req, res) => {
    try {
        const student = req.user;
        const { fingerprint, webRTCIPs } = req.body;

        // Get active session for student's section
        const QRSession = require('../models/QRSession');
        const session = await QRSession.findActiveSessionForSection(
            student.course,
            student.semester,
            student.section
        );

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'No active session found for your section'
            });
        }

        const studentData = {
            studentId: student.studentId,
            name: student.name,
            classRollNumber: student.classRollNumber,
            email: student.email,
            course: student.course,
            semester: student.semester,
            section: student.section,
            fingerprint,
            webRTCIPs,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
        };

        const result = await qrSessionService.joinSession(session.sessionId, studentData);

        res.json(result);

    } catch (error) {
        console.error('Join session error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to join session'
        });
    }
});

/**
 * @route   POST /api/qr-attendance/scan-qr
 * @desc    Student scans QR code to mark attendance
 * @access  Private (Student only)
 */
router.post('/scan-qr', auth, ensureStudent, async (req, res) => {
    try {
        const student = req.user;
        const { 
            qrToken, 
            fingerprint,
            photoFilename, 
            photoCloudinaryUrl 
        } = req.body;

        if (!qrToken) {
            return res.status(400).json({
                success: false,
                message: 'QR token is required'
            });
        }

        const studentData = {
            studentId: student.studentId,
            name: student.name,
            classRollNumber: student.classRollNumber,
            email: student.email,
            course: student.course,
            semester: student.semester,
            section: student.section,
            fingerprint,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip,
            photoFilename,
            photoCloudinaryUrl
        };

        const result = await qrSessionService.markAttendance(qrToken, studentData);

        res.json(result);

    } catch (error) {
        console.error('QR scan error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to mark attendance'
        });
    }
});

/**
 * @route   POST /api/qr-attendance/validate-qr
 * @desc    Validate QR token without marking attendance (for preview)
 * @access  Private (Student only)
 */
router.post('/validate-qr', auth, ensureStudent, async (req, res) => {
    try {
        const { qrToken } = req.body;

        if (!qrToken) {
            return res.status(400).json({
                success: false,
                message: 'QR token is required'
            });
        }

        const validation = qrTokenService.validateQRToken(qrToken);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error,
                code: validation.code
            });
        }

        // Get session details
        const session = await qrSessionService.getSessionById(validation.sessionData.sessionId);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            message: 'QR token is valid',
            sessionInfo: {
                sessionId: session.sessionId,
                facultyName: session.facultyName,
                department: session.department,
                semester: session.semester,
                section: session.section,
                totalStudents: session.totalStudents,
                studentsPresent: session.studentsPresent.length
            }
        });

    } catch (error) {
        console.error('QR validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate QR token'
        });
    }
});

// ==================== UTILITY ROUTES ====================

/**
 * @route   GET /api/qr-attendance/health
 * @desc    Health check for QR attendance system
 * @access  Public
 */
router.get('/health', (req, res) => {
    const cacheStats = qrTokenService.getCacheStats();
    
    res.json({
        success: true,
        message: 'QR Attendance system is healthy',
        timestamp: new Date().toISOString(),
        tokenCache: cacheStats,
        version: '1.0.0'
    });
});

/**
 * @route   GET /api/qr-attendance/stats
 * @desc    Get system statistics (for admin/monitoring)
 * @access  Private (Faculty only)
 */
router.get('/stats', auth, ensureFaculty, async (req, res) => {
    try {
        const QRSession = require('../models/QRSession');
        
        // Get basic statistics
        const totalSessions = await QRSession.countDocuments();
        const activeSessions = await QRSession.countDocuments({ 
            status: { $in: ['created', 'locked', 'active'] } 
        });
        const completedSessions = await QRSession.countDocuments({ status: 'ended' });
        
        // Get token cache stats
        const cacheStats = qrTokenService.getCacheStats();

        res.json({
            success: true,
            stats: {
                sessions: {
                    total: totalSessions,
                    active: activeSessions,
                    completed: completedSessions
                },
                tokenCache: cacheStats,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

module.exports = router;
