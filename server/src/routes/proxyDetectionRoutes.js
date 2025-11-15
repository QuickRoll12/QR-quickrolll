const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const qrSessionService = require('../services/qrSessionService');
const QRSession = require('../models/QRSession');
const GroupSession = require('../models/GroupSession');
const redisCache = require('../services/redisCache');

// 🔒 SECURITY: All proxy detection routes require authentication
router.use(auth);

// 🔒 SECURITY: Middleware to ensure only students can remove themselves
const ensureStudentOwnership = (req, res, next) => {
    try {
        const { studentId } = req.body;
        
        // 🔍 ENHANCED DEBUGGING: Log all relevant data
        console.log('🔍 STUDENT OWNERSHIP VALIDATION:');
        console.log('  Request studentId:', studentId);
        console.log('  JWT user data:', {
            id: req.user.id || req.user._id,
            studentId: req.user.studentId,
            role: req.user.role,
            classRollNumber: req.user.classRollNumber,
            semester: req.user.semester,
            section: req.user.section
        });
        
        // Verify the authenticated user is the same student being removed
        if (req.user.role !== 'student') {
            console.log('❌ VALIDATION FAILED: User role is not student');
            return res.status(403).json({
                success: false,
                message: 'Only students can use proxy detection API'
            });
        }
        
        // 🔧 FLEXIBLE MATCHING: Accept either studentId or MongoDB ObjectId
        // This handles cases where Android app sends either field
        const userStudentId = req.user.studentId;
        const userObjectId = req.user.id || req.user._id?.toString();
        
        if (studentId !== userStudentId && studentId !== userObjectId) {
            console.log('❌ VALIDATION FAILED: Student ID mismatch');
            console.log('  Expected studentId:', userStudentId);
            console.log('  Expected ObjectId:', userObjectId);
            console.log('  Received:', studentId);
            return res.status(403).json({
                success: false,
                message: `You can only remove yourself from sessions. Expected: ${userStudentId}, Got: ${studentId}`
            });
        }
        
        console.log('✅ Student ownership validation passed');
        next();
    } catch (error) {
        console.log('❌ VALIDATION ERROR:', error.message);
        res.status(403).json({
            success: false,
            message: 'Authorization failed',
            error: error.message
        });
    }
};

/**
 * 🚨 PROXY DETECTION API - Remove Student from Live Session
 * 
 * This API removes a student from Redis cache when proxy activity is detected.
 * It automatically finds the active session for the student's section and removes
 * them from Redis SETs to ensure they won't be counted as present when the session ends.
 * 
 * POST /api/proxy-detection/remove-student
 * 
 * Body:
 * {
 *   "studentId": "string",           // Required: Student ID for join cache removal
 *   "rollNumber": "string",          // Required: Roll number for attendance cache removal  
 *   "course": "string",              // Required: Student's course/department
 *   "semester": "string",            // Required: Student's semester
 *   "section": "string",             // Required: Student's section
 *   "reason": "string",              // Optional: Reason for removal (logging purposes)
 *   "detectionMethod": "string"      // Optional: Detection method used (logging purposes)
 * }
 */
router.post('/remove-student',ensureStudentOwnership, async (req, res) => {
    try {
        const { 
            studentId, 
            rollNumber, 
            course,
            semester,
            section,
            reason = 'Proxy',
            detectionMethod = 'Unknown'
        } = req.body;

        // Validation
        if (!studentId || !rollNumber || !course || !semester || !section) {
            return res.status(400).json({
                success: false,
                message: 'studentId, rollNumber, course, semester, and section are required'
            });
        }

        // 🔒 SECURITY: Cross-validate student data with authenticated user
        console.log('🔍 CROSS-VALIDATION CHECK:');
        console.log('  Request data:', { rollNumber, semester, section, course });
        console.log('  JWT user data:', { 
            classRollNumber: req.user.classRollNumber, 
            semester: req.user.semester, 
            section: req.user.section,
            course: req.user.course 
        });
        
        // 🔧 FLEXIBLE ROLL NUMBER MATCHING: Accept either classRollNumber or studentId as rollNumber
        const rollNumberMatches = (req.user.classRollNumber === rollNumber) || (req.user.studentId === rollNumber);
        
        if (!rollNumberMatches || 
            req.user.semester !== semester || 
            req.user.section !== section) {
            console.log('❌ CROSS-VALIDATION FAILED:');
            console.log('  rollNumber match:', rollNumberMatches, `(${req.user.classRollNumber} or ${req.user.studentId} vs ${rollNumber})`);
            console.log('  semester match:', req.user.semester === semester, `(${req.user.semester} vs ${semester})`);
            console.log('  section match:', req.user.section === section, `(${req.user.section} vs ${section})`);
            return res.status(403).json({
                success: false,
                message: 'Student data mismatch with authenticated user'
            });
        }
        
        console.log('✅ Cross-validation passed');

        let removedFromSessions = [];
        let errors = [];

        try {
            // Find active session for the student's section
            const activeSession = await QRSession.findActiveSessionForSection(course, semester, section);
            
            if (!activeSession) {
                return res.status(404).json({
                    success: false,
                    message: `No active session found for ${course}-${semester}-${section}`,
                    data: {
                        studentId,
                        rollNumber,
                        course,
                        semester,
                        section,
                        reason,
                        detectionMethod,
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Verify session is in active state (created, locked, or active)
            if (!['created', 'locked', 'active'].includes(activeSession.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Session ${activeSession.sessionId} is not in an active state (status: ${activeSession.status})`,
                    data: {
                        studentId,
                        rollNumber,
                        sessionId: activeSession.sessionId,
                        sessionStatus: activeSession.status,
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // 🔧 SMART CACHE REMOVAL: Use correct identifiers for each cache
            // Join cache uses actual studentId, attendance cache uses classRollNumber
            const actualStudentId = req.user.studentId; // Always use the correct studentId for join cache
            const actualRollNumber = req.user.classRollNumber; // Always use the correct classRollNumber for attendance cache
            const joinRemoved = await removeStudentFromJoinCache(activeSession.sessionId, actualStudentId);
            const attendanceRemoved = await removeStudentFromAttendanceCache(activeSession.sessionId, actualRollNumber);
            
            console.log(`🔧 Cache removal using: studentId=${actualStudentId}, classRollNumber=${actualRollNumber}`);
            
            removedFromSessions.push({
                sessionId: activeSession.sessionId,
                type: 'single',
                department: activeSession.department,
                semester: activeSession.semester,
                section: activeSession.section,
                sessionStatus: activeSession.status,
                joinCacheRemoved: joinRemoved,
                attendanceCacheRemoved: attendanceRemoved
            });
            
            console.log(`🚨 PROXY DETECTION: Removed student ${actualStudentId}/${actualRollNumber} from session ${activeSession.sessionId} (${course}-${semester}-${section}) - Reason: ${reason}`);

        } catch (error) {
            errors.push(`Error finding or removing from active session: ${error.message}`);
        }

        // Prepare response
        const actualStudentId = req.user.studentId; // Use the correct studentId in response
        const actualRollNumber = req.user.classRollNumber; // Use the correct classRollNumber in response
        const response = {
            success: removedFromSessions.length > 0,
            message: removedFromSessions.length > 0 
                ? `Student removed from ${removedFromSessions.length} session(s)` 
                : 'No active sessions found or student was not in any sessions',
            data: {
                studentId: actualStudentId, // Return the correct studentId
                requestedStudentId: studentId, // Show what was requested
                rollNumber: actualRollNumber, // Return the correct classRollNumber
                requestedRollNumber: rollNumber, // Show what was requested
                reason,
                detectionMethod,
                removedFromSessions,
                timestamp: new Date().toISOString()
            }
        };

        if (errors.length > 0) {
            response.warnings = errors;
        }

        // Log the proxy detection event for audit purposes
        console.log(`🚨 PROXY DETECTION EVENT:`, {
            studentId: actualStudentId,
            requestedStudentId: studentId,
            rollNumber: actualRollNumber,
            requestedRollNumber: rollNumber,
            reason,
            detectionMethod,
            removedCount: removedFromSessions.length,
            timestamp: new Date().toISOString()
        });

        res.status(200).json(response);

    } catch (error) {
        console.error('Proxy detection removal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove student from session',
            error: error.message
        });
    }
});

/**
 * Helper function to remove student from join cache
 * @param {string} sessionId - Session ID
 * @param {string} studentId - Student ID
 * @returns {boolean} - Success status
 */
async function removeStudentFromJoinCache(sessionId, studentId) {
    try {
        if (!redisCache.isHealthy()) {
            console.warn('⚠️ Redis not available for join cache removal');
            return false;
        }

        const redis = redisCache.getClient();
        const removed = await redis.sRem(`session:${sessionId}:joined`, studentId);
        
        console.log(`🗑️ Removed student ${studentId} from join cache for session ${sessionId}: ${removed > 0 ? 'SUCCESS' : 'NOT_FOUND'}`);
        return removed > 0;
    } catch (error) {
        console.error(`❌ Failed to remove student ${studentId} from join cache:`, error.message);
        return false;
    }
}

/**
 * Helper function to remove student from attendance cache
 * @param {string} sessionId - Session ID
 * @param {string} rollNumber - Student roll number
 * @returns {boolean} - Success status
 */
async function removeStudentFromAttendanceCache(sessionId, rollNumber) {
    try {
        if (!redisCache.isHealthy()) {
            console.warn('⚠️ Redis not available for attendance cache removal');
            return false;
        }

        const redis = redisCache.getClient();
        const removed = await redis.sRem(`session:${sessionId}:attended`, rollNumber);
        
        console.log(`🗑️ Removed student ${rollNumber} from attendance cache for session ${sessionId}: ${removed > 0 ? 'SUCCESS' : 'NOT_FOUND'}`);
        return removed > 0;
    } catch (error) {
        console.error(`❌ Failed to remove student ${rollNumber} from attendance cache:`, error.message);
        return false;
    }
}

/**
 * 🔍 UTILITY API - Check Student Status in Live Session
 * 
 * This API allows checking if a student is currently in Redis cache
 * for debugging and verification purposes. It automatically finds the
 * active session for the student's section.
 * 
 * POST /api/proxy-detection/student-status
 * 
 * Body:
 * {
 *   "studentId": "string",
 *   "rollNumber": "string",
 *   "course": "string",
 *   "semester": "string", 
 *   "section": "string"
 * }
 */
router.post('/student-status', ensureStudentOwnership, async (req, res) => {
    try {
        const { studentId, rollNumber, course, semester, section } = req.body;

        // Validation
        if (!studentId || !rollNumber || !course || !semester || !section) {
            return res.status(400).json({
                success: false,
                message: 'studentId, rollNumber, course, semester, and section are required'
            });
        }

        // 🔒 SECURITY: Cross-validate student data with authenticated user
        if (req.user.classRollNumber !== rollNumber || 
            req.user.semester !== semester || 
            req.user.section !== section) {
            return res.status(403).json({
                success: false,
                message: 'Student data mismatch with authenticated user'
            });
        }

        // Find active session for the student's section
        const activeSession = await QRSession.findActiveSessionForSection(course, semester, section);
        
        if (!activeSession) {
            return res.json({
                success: true,
                data: {
                    studentId,
                    rollNumber,
                    course,
                    semester,
                    section,
                    sessionExists: false,
                    sessionStatus: 'no_active_session',
                    isInJoinCache: false,
                    isInAttendanceCache: false,
                    wouldBeCounted: false,
                    message: 'No active session found for this section',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (!redisCache.isHealthy()) {
            return res.status(503).json({
                success: false,
                message: 'Redis cache not available',
                data: {
                    sessionId: activeSession.sessionId,
                    sessionExists: true,
                    sessionStatus: activeSession.status
                }
            });
        }

        const redis = redisCache.getClient();
        
        // Check both caches using correct identifiers
        const actualStudentId = req.user.studentId; // Use correct studentId for join cache
        const isInJoinCache = await redis.sIsMember(`session:${activeSession.sessionId}:joined`, actualStudentId);
        const isInAttendanceCache = await redis.sIsMember(`session:${activeSession.sessionId}:attended`, rollNumber);
        
        res.json({
            success: true,
            data: {
                studentId,
                rollNumber,
                course,
                semester,
                section,
                sessionId: activeSession.sessionId,
                sessionExists: true,
                sessionStatus: activeSession.status,
                isInJoinCache,
                isInAttendanceCache,
                wouldBeCounted: isInAttendanceCache, // This is what matters for final count
                message: isInAttendanceCache 
                    ? 'Student WILL be counted in final attendance' 
                    : 'Student will NOT be counted in final attendance',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Student status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check student status',
            error: error.message
        });
    }
});

/**
 * 📊 UTILITY API - Get Session Cache Stats
 * 
 * This API provides statistics about Redis cache for a session
 * 
 * GET /api/proxy-detection/session-stats/:sessionId
 */
router.get('/session-stats/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!redisCache.isHealthy()) {
            return res.status(503).json({
                success: false,
                message: 'Redis cache not available'
            });
        }

        const redis = redisCache.getClient();
        
        // Get counts and members
        const joinedCount = await redis.sCard(`session:${sessionId}:joined`);
        const attendedCount = await redis.sCard(`session:${sessionId}:attended`);
        const joinedMembers = await redis.sMembers(`session:${sessionId}:joined`);
        const attendedMembers = await redis.sMembers(`session:${sessionId}:attended`);
        
        // Get session info
        const session = await qrSessionService.getSessionById(sessionId);
        
        res.json({
            success: true,
            data: {
                sessionId,
                sessionExists: !!session,
                sessionStatus: session?.status || 'not_found',
                totalStudents: session?.totalStudents || 0,
                cache: {
                    joinedCount,
                    attendedCount,
                    joinedStudents: joinedMembers,
                    attendedStudents: attendedMembers.sort()
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Session stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get session stats',
            error: error.message
        });
    }
});

module.exports = router;
