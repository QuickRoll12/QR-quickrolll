const QRSession = require('../models/QRSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const qrTokenService = require('./qrTokenService');
const { v4: uuidv4 } = require('uuid');

class QRSessionService {
    constructor() {
        this.activeSessions = new Map(); // In-memory cache for active sessions
        this.qrRefreshIntervals = new Map(); // Store interval IDs for QR refresh
        this.io = null; // Socket.io instance for real-time updates
    }

    /**
     * Set the socket.io instance for real-time updates
     * @param {Object} io - Socket.io instance
     */
    setSocketIO(io) {
        this.io = io;
    }

    /**
     * Start a new QR session (Faculty clicks "Start Session")
     * @param {Object} sessionData - Session information
     * @param {Object} facultyData - Faculty information
     * @returns {Object} - Created session
     */
    async startSession(sessionData, facultyData) {
        const { department, semester, section, totalStudents, sessionType = 'roll' } = sessionData;
        const { facultyId, name: facultyName, email: facultyEmail } = facultyData;

        // Check if there's already an active session for this section
        const existingSession = await QRSession.findActiveSessionForSection(department, semester, section);
        if (existingSession) {
            throw new Error('An active session already exists for this section');
        }

        // Generate unique session ID
        const sessionId = uuidv4();

        // Create new QR session
        const qrSession = new QRSession({
            sessionId,
            facultyId,
            facultyName,
            facultyEmail,
            department,
            semester,
            section,
            totalStudents,
            sessionType,
            status: 'created',
            photoVerificationRequired: true,
            analytics: {
                totalQRScans: 0,
                uniqueDevices: 0,
                duplicateAttempts: 0,
                invalidQRAttempts: 0
            }
        });

        await qrSession.save();

        // Cache the session
        this.activeSessions.set(sessionId, qrSession);

        console.log(`✅ QR Session started: ${sessionId} for ${department}-${semester}-${section}`);

        return {
            success: true,
            sessionId,
            status: 'created',
            message: 'Session started successfully. Students can now join.',
            sessionData: {
                sessionId,
                department,
                semester,
                section,
                totalStudents,
                sessionType,
                status: 'created',
                studentsJoined: [],
                canLock: true,
                canStartAttendance: false
            }
        };
    }

    /**
     * Lock a session (Faculty clicks "Lock Session")
     * @param {string} sessionId - Session ID
     * @param {string} facultyId - Faculty ID for authorization
     * @returns {Object} - Updated session
     */
    async lockSession(sessionId, facultyId) {
        const session = await this.getSessionById(sessionId);
        
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.facultyId !== facultyId) {
            throw new Error('Unauthorized: You can only lock your own sessions');
        }

        if (session.status !== 'created') {
            throw new Error('Session cannot be locked in current state');
        }

        // Update session status
        session.status = 'locked';
        session.lockedAt = new Date();
        await session.save();

        // Update cache
        this.activeSessions.set(sessionId, session);

        console.log(`🔒 Session locked: ${sessionId}`);

        return {
            success: true,
            sessionId,
            status: 'locked',
            message: 'Session locked successfully. Students can no longer join.',
            sessionData: {
                sessionId,
                department: session.department,
                semester: session.semester,
                section: session.section,
                totalStudents: session.totalStudents,
                status: 'locked',
                studentsJoined: session.studentsJoined,
                canLock: false,
                canStartAttendance: true,
                lockedAt: session.lockedAt
            }
        };
    }

    /**
     * Start attendance (Faculty clicks "Start Attendance")
     * @param {string} sessionId - Session ID
     * @param {string} facultyId - Faculty ID for authorization
     * @returns {Object} - Session with first QR token
     */
    async startAttendance(sessionId, facultyId) {
        const session = await this.getSessionById(sessionId);
        
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.facultyId !== facultyId) {
            throw new Error('Unauthorized: You can only start attendance for your own sessions');
        }

        if (session.status !== 'locked') {
            throw new Error('Session must be locked before starting attendance');
        }

        // Update session status
        session.status = 'active';
        session.startedAt = new Date();

        // Generate first QR token
        const tokenData = qrTokenService.generateQRToken({
            sessionId: session.sessionId,
            facultyId: session.facultyId,
            department: session.department,
            semester: session.semester,
            section: session.section
        });

        // Update session with QR token
        session.currentQRToken = tokenData.token;
        session.qrTokenExpiry = tokenData.expiryTime;
        session.qrRefreshCount = 1;

        await session.save();

        // Update cache
        this.activeSessions.set(sessionId, session);

        // Start QR refresh interval (every 5 seconds)
        this.startQRRefresh(sessionId);

        console.log(`📱 Attendance started: ${sessionId} with QR token`);

        return {
            success: true,
            sessionId,
            status: 'active',
            message: 'Attendance started successfully. QR codes are now active.',
            qrData: {
                token: tokenData.token,
                expiryTime: tokenData.expiryTime,
                refreshCount: 1,
                timerSeconds: 5
            },
            sessionData: {
                sessionId,
                department: session.department,
                semester: session.semester,
                section: session.section,
                totalStudents: session.totalStudents,
                status: 'active',
                studentsJoined: session.studentsJoined,
                studentsPresent: session.studentsPresent,
                startedAt: session.startedAt
            }
        };
    }

    /**
     * Student joins a session
     * @param {string} sessionId - Session ID
     * @param {Object} studentData - Student information
     * @returns {Object} - Join result
     */
    async joinSession(sessionId, studentData) {
        const session = await this.getSessionById(sessionId);
        
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.canJoin()) {
            throw new Error('Session is locked. You cannot join at this time.');
        }

        // Check if student belongs to this section
        if (studentData.course !== session.department || 
            studentData.semester !== session.semester || 
            studentData.section !== session.section) {
            throw new Error('You are not enrolled in this section');
        }

        // Check if student already joined
        if (session.hasStudentJoined(studentData.studentId)) {
            return {
                success: true,
                message: 'You have already joined this session',
                alreadyJoined: true
            };
        }

        // Add student to joined list
        const joinData = {
            studentId: studentData.studentId,
            studentName: studentData.name,
            rollNumber: studentData.classRollNumber,
            email: studentData.email,
            joinedAt: new Date(),
            deviceInfo: {
                fingerprint: studentData.fingerprint,
                webRTCIPs: studentData.webRTCIPs,
                userAgent: studentData.userAgent,
                ipAddress: studentData.ipAddress
            }
        };

        session.studentsJoined.push(joinData);
        await session.save();

        // Update cache
        this.activeSessions.set(sessionId, session);

        console.log(`👤 Student joined: ${studentData.name} (${studentData.studentId}) in session ${sessionId}`);

        return {
            success: true,
            message: 'Successfully joined the session. Wait for faculty to start attendance.',
            sessionData: {
                sessionId,
                status: session.status,
                canScanQR: session.status === 'active',
                joinedAt: joinData.joinedAt
            }
        };
    }

    /**
     * Mark attendance via QR scan
     * @param {string} qrToken - QR token from scan
     * @param {Object} studentData - Student information
     * @returns {Object} - Attendance result
     */
    async markAttendance(qrToken, studentData) {
        // Validate QR token
        const tokenValidation = qrTokenService.validateQRToken(qrToken);
        if (!tokenValidation.valid) {
            // Increment invalid attempts
            const session = await QRSession.findOne({ 
                department: studentData.course,
                semester: studentData.semester,
                section: studentData.section,
                status: 'active'
            });
            if (session) {
                session.analytics.invalidQRAttempts += 1;
                await session.save();
            }
            
            throw new Error(tokenValidation.error);
        }

        const { sessionData: tokenSessionData } = tokenValidation;
        const session = await this.getSessionById(tokenSessionData.sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        // Check if student belongs to this section
        if (studentData.course !== session.department || 
            studentData.semester !== session.semester || 
            studentData.section !== session.section) {
            throw new Error('You are not enrolled in this section');
        }

        // Check if student joined the session
        if (!session.hasStudentJoined(studentData.studentId)) {
            throw new Error('You must join the session first');
        }

        // Check if student already marked attendance
        if (session.hasStudentMarkedAttendance(studentData.studentId)) {
            session.analytics.duplicateAttempts += 1;
            await session.save();
            throw new Error('Attendance already marked for this session');
        }

        // NOTE: We don't mark token as "used" because multiple students should be able to scan the same QR code
        // Individual duplicate prevention is handled by checking if student already marked attendance

        // Add student to present list
        const attendanceData = {
            studentId: studentData.studentId,
            studentName: studentData.name,
            rollNumber: studentData.classRollNumber,
            email: studentData.email,
            markedAt: new Date(),
            qrToken: qrToken,
            deviceInfo: {
                fingerprint: studentData.fingerprint,
                webRTCIPs: studentData.webRTCIPs,
                userAgent: studentData.userAgent,
                ipAddress: studentData.ipAddress
            },
            photoFilename: studentData.photoFilename,
            photoCloudinaryUrl: studentData.photoCloudinaryUrl,
            verificationStatus: 'verified'
        };

        session.studentsPresent.push(attendanceData);
        session.analytics.totalQRScans += 1;
        
        // Update unique devices count
        const uniqueFingerprints = new Set(session.studentsPresent.map(s => s.deviceInfo.fingerprint));
        session.analytics.uniqueDevices = uniqueFingerprints.size;

        await session.save();

        // Update cache
        this.activeSessions.set(session.sessionId, session);

        console.log(`✅ Attendance marked: ${studentData.name} (${studentData.studentId}) in session ${session.sessionId}`);

        return {
            success: true,
            message: 'Attendance marked successfully!',
            attendanceData: {
                sessionId: session.sessionId,
                studentName: studentData.name,
                rollNumber: studentData.classRollNumber,
                markedAt: attendanceData.markedAt,
                status: 'present'
            },
            sessionStats: {
                totalStudents: session.totalStudents,
                studentsJoined: session.studentsJoined.length,
                studentsPresent: session.studentsPresent.length,
                presentPercentage: Math.round((session.studentsPresent.length / session.totalStudents) * 100)
            }
        };
    }

    /**
     * End a session and create final attendance record
     * @param {string} sessionId - Session ID
     * @param {string} facultyId - Faculty ID for authorization
     * @returns {Object} - Final session data
     */
    async endSession(sessionId, facultyId) {
        const session = await this.getSessionById(sessionId);
        
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.facultyId !== facultyId) {
            throw new Error('Unauthorized: You can only end your own sessions');
        }

        if (session.status === 'ended') {
            throw new Error('Session already ended');
        }

        // Stop QR refresh
        this.stopQRRefresh(sessionId);

        // Update session status
        session.status = 'ended';
        session.endedAt = new Date();

        // Invalidate any remaining QR tokens
        qrTokenService.invalidateSessionTokens(sessionId);

        await session.save();

        // Create final attendance record (compatible with existing system)
        const presentStudents = session.studentsPresent.map(s => s.rollNumber || s.email);
        const allStudents = Array.from({length: session.totalStudents}, (_, i) => String(i + 1).padStart(2, '0'));
        const absentees = session.sessionType === 'roll' 
            ? allStudents.filter(roll => !presentStudents.includes(roll))
            : []; // For Gmail sessions, we don't calculate absentees this way

        const attendanceRecord = new AttendanceRecord({
            facultyId: session.facultyId,
            facultyName: session.facultyName,
            facultyEmail: session.facultyEmail,
            department: session.department,
            semester: session.semester,
            section: session.section,
            date: session.createdAt,
            totalStudents: session.totalStudents,
            presentCount: session.studentsPresent.length,
            absentees: absentees,
            presentStudents: presentStudents,
            sessionType: session.sessionType,
            photoVerificationRequired: session.photoVerificationRequired,
            studentPhotos: session.studentsPresent.map(s => ({
                studentId: s.studentId,
                rollNumber: s.rollNumber,
                photoFilename: s.photoFilename,
                photoTimestamp: s.markedAt,
                verificationStatus: s.verificationStatus
            }))
        });

        await attendanceRecord.save();

        // Remove from cache
        this.activeSessions.delete(sessionId);

        console.log(`🏁 Session ended: ${sessionId}, Attendance record created: ${attendanceRecord._id}`);

        return {
            success: true,
            message: 'Session ended successfully',
            sessionId,
            attendanceRecordId: attendanceRecord._id,
            finalStats: {
                totalStudents: session.totalStudents,
                studentsJoined: session.studentsJoined.length,
                studentsPresent: session.studentsPresent.length,
                absentees: absentees.length,
                presentPercentage: Math.round((session.studentsPresent.length / session.totalStudents) * 100),
                sessionDuration: Math.round((session.endedAt - session.createdAt) / 1000 / 60), // minutes
                qrRefreshCount: session.qrRefreshCount,
                analytics: session.analytics
            }
        };
    }

    /**
     * Get session status for students
     * @param {string} department - Department
     * @param {string} semester - Semester  
     * @param {string} section - Section
     * @param {string} studentId - Student ID
     * @returns {Object} - Session status
     */
    async getSessionStatus(department, semester, section, studentId) {
        const session = await QRSession.findActiveSessionForSection(department, semester, section);
        
        if (!session) {
            return {
                hasActiveSession: false,
                canJoin: false,
                canScanQR: false,
                message: 'No active session found for your section'
            };
        }

        const hasJoined = session.hasStudentJoined(studentId);
        const hasMarkedAttendance = session.hasStudentMarkedAttendance(studentId);

        return {
            hasActiveSession: true,
            sessionId: session.sessionId,
            status: session.status,
            canJoin: session.canJoin() && !hasJoined,
            canScanQR: session.isActive() && hasJoined && !hasMarkedAttendance,
            hasJoined,
            hasMarkedAttendance,
            message: this.getStatusMessage(session.status, hasJoined, hasMarkedAttendance),
            sessionData: {
                facultyName: session.facultyName,
                totalStudents: session.totalStudents,
                studentsJoined: session.studentsJoined.length,
                studentsPresent: session.studentsPresent.length
            }
        };
    }

    /**
     * Start QR refresh interval for a session
     * @param {string} sessionId - Session ID
     */
    startQRRefresh(sessionId) {
        // Clear any existing interval
        this.stopQRRefresh(sessionId);

        const intervalId = setInterval(async () => {
            try {
                await this.refreshQRToken(sessionId);
            } catch (error) {
                console.error(`Error refreshing QR for session ${sessionId}:`, error);
                this.stopQRRefresh(sessionId);
            }
        }, 5000); // Refresh every 5 seconds

        this.qrRefreshIntervals.set(sessionId, intervalId);
        console.log(`🔄 QR refresh started for session: ${sessionId}`);
    }

    /**
     * Stop QR refresh interval for a session
     * @param {string} sessionId - Session ID
     */
    stopQRRefresh(sessionId) {
        const intervalId = this.qrRefreshIntervals.get(sessionId);
        if (intervalId) {
            clearInterval(intervalId);
            this.qrRefreshIntervals.delete(sessionId);
            console.log(`⏹️ QR refresh stopped for session: ${sessionId}`);
        }
    }

    /**
     * Refresh QR token for a session
     * @param {string} sessionId - Session ID
     * @returns {Object} - New QR token data
     */
    async refreshQRToken(sessionId) {
        const session = await this.getSessionById(sessionId);
        
        if (!session || session.status !== 'active') {
            this.stopQRRefresh(sessionId);
            return null;
        }

        // Generate new QR token
        const tokenData = qrTokenService.generateQRToken({
            sessionId: session.sessionId,
            facultyId: session.facultyId,
            department: session.department,
            semester: session.semester,
            section: session.section
        });

        // Update session
        session.currentQRToken = tokenData.token;
        session.qrTokenExpiry = tokenData.expiryTime;
        session.qrRefreshCount += 1;

        await session.save();

        // Update cache
        this.activeSessions.set(sessionId, session);

        const qrData = {
            token: tokenData.token,
            expiryTime: tokenData.expiryTime,
            refreshCount: session.qrRefreshCount,
            timerSeconds: 5
        };

        // Emit new QR token to connected faculty clients
        if (this.io) {
            const roomName = `faculty-${session.facultyId}`;
            this.io.to(roomName).emit('qr-tokenRefresh', qrData);
        }

        return qrData;
    }

    /**
     * Get session by ID (with caching)
     * @param {string} sessionId - Session ID
     * @returns {Object} - Session object
     */
    async getSessionById(sessionId) {
        // Try cache first
        let session = this.activeSessions.get(sessionId);
        
        if (!session) {
            // Fetch from database
            session = await QRSession.findOne({ sessionId });
            if (session && session.status !== 'ended') {
                this.activeSessions.set(sessionId, session);
            }
        }
        
        return session;
    }

    /**
     * Get status message for students
     * @param {string} status - Session status
     * @param {boolean} hasJoined - Has student joined
     * @param {boolean} hasMarkedAttendance - Has student marked attendance
     * @returns {string} - Status message
     */
    getStatusMessage(status, hasJoined, hasMarkedAttendance) {
        if (hasMarkedAttendance) {
            return 'Attendance already marked ✅';
        }
        
        switch (status) {
            case 'created':
                return hasJoined ? 'Waiting for faculty to start attendance' : 'Click Join to enter attendance area';
            case 'locked':
                return hasJoined ? 'Waiting for faculty to start attendance' : 'Session locked - cannot join';
            case 'active':
                return hasJoined ? 'Scan QR code to mark attendance' : 'Session locked - cannot join';
            case 'ended':
                return 'Session has ended';
            default:
                return 'Unknown session status';
        }
    }

    /**
     * Get faculty dashboard data
     * @param {string} facultyId - Faculty ID
     * @returns {Object} - Dashboard data
     */
    async getFacultyDashboardData(facultyId) {
        const activeSessions = await QRSession.getFacultyActiveSessions(facultyId);
        
        return {
            activeSessions: activeSessions.map(session => ({
                sessionId: session.sessionId,
                department: session.department,
                semester: session.semester,
                section: session.section,
                status: session.status,
                totalStudents: session.totalStudents,
                studentsJoined: session.studentsJoined.length,
                studentsPresent: session.studentsPresent.length,
                createdAt: session.createdAt,
                currentQRToken: session.currentQRToken,
                qrTokenExpiry: session.qrTokenExpiry,
                canLock: session.canJoin(),
                canStartAttendance: session.canStartAttendance(),
                isActive: session.isActive()
            }))
        };
    }
}

// Create singleton instance
const qrSessionService = new QRSessionService();

module.exports = qrSessionService;
