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
     */
    async startSession(sessionData, facultyData) {
        const { department, semester, section, totalStudents, sessionType = 'roll' } = sessionData;
        const { facultyId, name: facultyName, email: facultyEmail } = facultyData;

        // Force cleanup any existing sessions for this section first
        console.log(`🧹 Cleaning up existing sessions for ${department}-${semester}-${section}`);
        
        // End any active sessions for this section (atomic operation)
        const cleanupResult = await QRSession.updateMany(
            {
                department,
                semester,
                section,
                status: { $in: ['created', 'locked', 'active'] }
            },
            { 
                status: 'ended', 
                endedAt: new Date() 
            }
        );
        
        if (cleanupResult.modifiedCount > 0) {
            console.log(`🧹 Ended ${cleanupResult.modifiedCount} existing sessions for section`);
        }
        
        // Clean up old ended sessions (older than 24 hours)
        await QRSession.deleteMany({
            department,
            semester,
            section,
            status: 'ended',
            endedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });
        
        // Clear cache for this section
        for (const [cachedSessionId, cachedSession] of this.activeSessions.entries()) {
            if (cachedSession.department === department && 
                cachedSession.semester === semester && 
                cachedSession.section === section) {
                this.activeSessions.delete(cachedSessionId);
            }
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
            }
        };
    }

    /**
     * Unlock a session (Faculty clicks "Unlock Session")
     * @param {string} sessionId - Session ID
     * @param {string} facultyId - Faculty ID
     * @returns {Object} - Updated session data
     */
    async unlockSession(sessionId, facultyId) {
        const session = await this.getSessionById(sessionId);
        
        if (!session) {
            throw new Error('Session not found');
        }

        if (session.facultyId !== facultyId) {
            throw new Error('Unauthorized: You can only unlock your own sessions');
        }

        if (session.status !== 'locked') {
            throw new Error('Session is not locked');
        }

        // Update session status back to created
        session.status = 'created';
        session.lockedAt = null;

        await session.save();

        // Update cache
        this.activeSessions.set(sessionId, session);

        console.log(`🔓 Session unlocked: ${sessionId}`);

        return {
            success: true,
            message: 'Session unlocked successfully',
            sessionData: {
                sessionId: session.sessionId,
                status: session.status,
                studentsJoined: session.studentsJoined.length,
                canJoin: true,
                canStartAttendance: false,
                department: session.department,
                semester: session.semester,
                section: session.section,
                facultyName: session.facultyName,
                facultyId: session.facultyId
            }
        };
    }

    /**
     * Start attendance (Faculty clicks "Start Attendance")
     * @param {string} sessionId - Session ID
     * @param {string} facultyId - Faculty ID
     * @returns {Object} - QR token data
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
                alreadyJoined: true,
                sessionData: {
                    sessionId,
                    status: session.status,
                    canScanQR: session.status === 'active',
                    facultyId: session.facultyId,
                    studentsJoined: session.studentsJoined.length
                }
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
                joinedAt: joinData.joinedAt,
                facultyId: session.facultyId,
                studentsJoined: session.studentsJoined.length
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
            // // Increment invalid attempts
            // const session = await QRSession.findOne({ 
            //     department: studentData.course,
            //     semester: studentData.semester,
            //     section: studentData.section,
            //     status: 'active'
            // });
            // if (session) {
            //     session.analytics.invalidQRAttempts += 1;
            //     await session.save();
            // }
            
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

        console.log(`Student ${studentData.name} has Device id: ${studentData.fingerprint}`);
        console.log(`Student ${studentData.name} has WebRTC IP: ${studentData.webRTCIPs}`);
        console.log(`Student ${studentData.name} has User Agent: ${studentData.userAgent}`);
        console.log(`Student ${studentData.name} has IP Address: ${studentData.ipAddress}`);

        // Check if fingerprint(Android Id) already used in this session (to prevent cloned apps)
        const isFingerprintUsed = session.studentsPresent.some(
            s => s.deviceInfo?.fingerprint === studentData.fingerprint
        );

        if (isFingerprintUsed) {
            throw new Error('Cloned app Found !');
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
        // Use atomic update to prevent parallel save errors
        const session = await QRSession.findOneAndUpdate(
            { 
                sessionId, 
                facultyId,
                status: { $ne: 'ended' } // Only update if not already ended
            },
            { 
                status: 'ended',
                endedAt: new Date()
            },
            { 
                new: true, // Return updated document
                runValidators: true
            }
        );
        
        if (!session) {
            // Check if session exists but is already ended
            const existingSession = await QRSession.findOne({ sessionId });
            if (existingSession && existingSession.status === 'ended') {
                throw new Error('Session already ended');
            }
            if (existingSession && existingSession.facultyId !== facultyId) {
                throw new Error('Unauthorized: You can only end your own sessions');
            }
            throw new Error('Session not found');
        }

        // Stop QR refresh
        this.stopQRRefresh(sessionId);

        // Invalidate any remaining QR tokens
        qrTokenService.invalidateSessionTokens(sessionId);

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

        // Remove from cache immediately
        this.activeSessions.delete(sessionId);
        
        // Clean up any other sessions for this section to prevent conflicts
        try {
            await QRSession.updateMany(
                {
                    department: session.department,
                    semester: session.semester,
                    section: session.section,
                    status: { $ne: 'ended' },
                    sessionId: { $ne: sessionId }
                },
                { 
                    status: 'ended', 
                    endedAt: new Date() 
                }
            );
            console.log(`🧹 Cleaned up conflicting sessions for ${session.department}-${session.semester}-${session.section}`);
        } catch (cleanupError) {
            console.error('⚠️ Error cleaning up conflicting sessions:', cleanupError);
            // Don't throw - this is cleanup, not critical
        }

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
     * Get student session status (for mobile app)
     * @param {string} course - Student's course
     * @param {string} semester - Student's semester  
     * @param {string} section - Student's section
     * @param {string} studentId - Student ID
     * @returns {Object} - Session status data
     */
    async getStudentSessionStatus(course, semester, section, studentId) {
        try {
            // Find active session for the student's section
            const session = await QRSession.findOne({
                department: course,
                semester: semester,
                section: section,
                status: { $in: ['created', 'locked', 'active'] }
            }).sort({ createdAt: -1 });

            if (!session) {
                return {
                    success: true,
                    hasActiveSession: false,
                    sessionId: null,
                    status: 'ended',
                    canJoin: false,
                    canScanQR: false,
                    hasJoined: false,
                    hasMarkedAttendance: false,
                    message: 'No active session for your section',
                    facultyName: '',
                    department: course,
                    semester: semester,
                    section: section
                };
            }

            const hasJoined = session.hasStudentJoined(studentId);
            const hasMarkedAttendance = session.hasStudentMarkedAttendance(studentId);

            let canJoin = false;
            let canScanQR = false;
            let message = '';

            switch (session.status) {
                case 'created':
                    canJoin = !hasJoined;
                    canScanQR = false;
                    message = hasJoined ? 'Wait for faculty to lock session' : 'Click Join to enter attendance area';
                    break;
                case 'locked':
                    canJoin = false;
                    canScanQR = false;
                    message = hasJoined ? 'Wait for faculty to start attendance' : 'Session locked - cannot join';
                    break;
                case 'active':
                    canJoin = false;
                    canScanQR = hasJoined && !hasMarkedAttendance;
                    message = hasMarkedAttendance ? 'Attendance marked successfully!' : 
                             hasJoined ? 'Scan QR code to mark attendance' : 'Session active but you haven\'t joined';
                    break;
            }

            return {
                success: true,
                hasActiveSession: true,
                sessionId: session.sessionId,
                status: session.status,
                canJoin: canJoin,
                canScanQR: canScanQR,
                hasJoined: hasJoined,
                hasMarkedAttendance: hasMarkedAttendance,
                message: message,
                facultyName: session.facultyName,
                department: session.department,
                semester: session.semester,
                section: session.section,
                totalStudents: session.totalStudents,
                studentsJoined: session.studentsJoined.length,
                studentsPresent: session.studentsPresent.length
            };

        } catch (error) {
            console.error('Error getting student session status:', error);
            throw new Error('Failed to get session status');
        }
    }

    /**
     * Get session by ID
     * @param {string} sessionId - Session ID
     * @returns {Object} - Session data
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
