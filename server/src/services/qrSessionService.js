const QRSession = require('../models/QRSession');
const SessionJoin = require('../models/SessionJoin');
const SessionAttendance = require('../models/SessionAttendance');
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');
const qrTokenService = require('./qrTokenService');
const { v4: uuidv4 } = require('uuid');

class QRSessionService {
    constructor() {
        this.activeSessions = new Map(); // In-memory cache for active sessions
        this.qrRefreshIntervals = new Map(); // Store interval IDs for QR refresh
        this.io = null; // Socket.io instance for real-time updates
        
        // 🚀 OPTIMIZED: Device fingerprint cache to minimize DB calls
        this.deviceCache = new Map(); // studentId -> deviceId mapping
        this.sectionDeviceCache = new Map(); // sectionKey -> Map(studentId -> deviceId)
        this.cacheExpiry = new Map(); // Track cache expiry times
        this.CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache TTL
        this.cacheHits = 0; // Track cache performance
        this.cacheMisses = 0;
        
        // Start periodic cache cleanup (every 10 minutes)
        setInterval(() => {
            this.clearExpiredCache();
        }, 10 * 60 * 1000);
    }

    /**
     * Set the socket.io instance for real-time updates
     * @param {Object} io - Socket.io instance
     */
    setSocketIO(io) {
        this.io = io;
    }

    /**
     * 🚀 OPTIMIZED: Get device ID for a student with intelligent caching
     * @param {string} studentId - Student ID
     * @param {string} department - Department
     * @param {string} semester - Semester  
     * @param {string} section - Section
     * @returns {string|null} - Device ID or null
     */
    async getStudentDeviceId(studentId, department, semester, section) {
        const sectionKey = `${department}-${semester}-${section}`;
        const now = Date.now();

        // Check individual cache first (fastest)
        if (this.deviceCache.has(studentId)) {
            const cacheTime = this.cacheExpiry.get(studentId);
            if (cacheTime && now < cacheTime) {
                this.cacheHits++;
                return this.deviceCache.get(studentId);
            }
            // Expired - remove from cache
            this.deviceCache.delete(studentId);
            this.cacheExpiry.delete(studentId);
        }

        // Check section cache (batch cache)
        if (this.sectionDeviceCache.has(sectionKey)) {
            const sectionCache = this.sectionDeviceCache.get(sectionKey);
            const cacheTime = this.cacheExpiry.get(sectionKey);
            
            if (cacheTime && now < cacheTime && sectionCache.has(studentId)) {
                const deviceId = sectionCache.get(studentId);
                // Also cache individually for faster future access
                this.deviceCache.set(studentId, deviceId);
                this.cacheExpiry.set(studentId, now + this.CACHE_TTL);
                this.cacheHits++;
                return deviceId;
            }
            
            // Section cache expired
            if (!cacheTime || now >= cacheTime) {
                this.sectionDeviceCache.delete(sectionKey);
                this.cacheExpiry.delete(sectionKey);
            }
        }

        // Cache miss - fetch from database
        this.cacheMisses++;
        console.log(`📊 Cache miss for section ${sectionKey}, fetching device IDs from DB`);
        
        try {
            // Fetch all students in this section at once (batch optimization)
            const sectionStudents = await User.find({
                course: department,
                semester: semester,
                section: section,
                role: 'student'
            }).select('studentId deviceId').lean();

            // Create section cache
            const sectionCache = new Map();
            sectionStudents.forEach(student => {
                if (student.deviceId) {
                    sectionCache.set(student.studentId, student.deviceId);
                    // Also cache individually
                    this.deviceCache.set(student.studentId, student.deviceId);
                    this.cacheExpiry.set(student.studentId, now + this.CACHE_TTL);
                }
            });

            // Cache the entire section
            this.sectionDeviceCache.set(sectionKey, sectionCache);
            this.cacheExpiry.set(sectionKey, now + this.CACHE_TTL);

            console.log(`✅ Cached ${sectionStudents.length} device IDs for section ${sectionKey}`);
            
            return sectionCache.get(studentId) || null;

        } catch (error) {
            console.error('❌ Error fetching device IDs:', error);
            return null;
        }
    }

    /**
     * 🚀 OPTIMIZED: Preload device cache for a session (called when session starts)
     * @param {Object} session - QR Session object
     */
    async preloadDeviceCache(session) {
        const sectionKey = `${session.department}-${session.semester}-${session.section}`;
        
        // Skip if already cached and not expired
        const cacheTime = this.cacheExpiry.get(sectionKey);
        if (cacheTime && Date.now() < cacheTime) {
            console.log(`📋 Device cache already loaded for section ${sectionKey}`);
            return;
        }

        console.log(`🚀 Preloading device cache for section ${sectionKey}`);
        
        // This will populate the cache
        await this.getStudentDeviceId('dummy', session.department, session.semester, session.section);
    }

    /**
     * Clear expired cache entries (maintenance method)
     */
    clearExpiredCache() {
        const now = Date.now();
        let expiredCount = 0;
        
        // Clear individual cache
        for (const [key, expiry] of this.cacheExpiry.entries()) {
            if (now >= expiry) {
                this.deviceCache.delete(key);
                this.sectionDeviceCache.delete(key);
                this.cacheExpiry.delete(key);
                expiredCount++;
            }
        }
        
        if (expiredCount > 0) {
            console.log(`🧹 Cleared ${expiredCount} expired cache entries`);
        }
    }

    /**
     * Get cache statistics for monitoring
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            deviceCacheSize: this.deviceCache.size,
            sectionCacheSize: this.sectionDeviceCache.size,
            totalCacheEntries: this.cacheExpiry.size,
            cacheTTL: this.CACHE_TTL / 1000 / 60, // minutes
            cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
        };
    }

    /**
     * Force refresh cache for a specific section
     * @param {string} department - Department
     * @param {string} semester - Semester
     * @param {string} section - Section
     */
    async refreshSectionCache(department, semester, section) {
        const sectionKey = `${department}-${semester}-${section}`;
        
        // Clear existing cache
        this.sectionDeviceCache.delete(sectionKey);
        this.cacheExpiry.delete(sectionKey);
        
        // Reload cache
        await this.getStudentDeviceId('dummy', department, semester, section);
        
        console.log(`🔄 Refreshed device cache for section ${sectionKey}`);
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
        // console.log(`🧹 Cleaning up existing sessions for ${department}-${semester}-${section}`);
        
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

        // 🚀 OPTIMIZED: Preload device cache for this section
        await this.preloadDeviceCache(qrSession);

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
                studentsJoinedCount: session.studentsJoinedCount,
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

        return {
            success: true,
            message: 'Session unlocked successfully',
            sessionData: {
                sessionId: session.sessionId,
                status: session.status,
                studentsJoinedCount: session.studentsJoinedCount,
                totalStudents: session.totalStudents,
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
                studentsJoinedCount: session.studentsJoinedCount,
                studentsPresentCount: session.studentsPresentCount,
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

        // Optimized join data preparation
        const joinData = {
            sessionId,
            studentId: studentData.studentId,
            studentName: studentData.name,
            rollNumber: studentData.classRollNumber,
            email: studentData.email,
            department: session.department,
            semester: session.semester,
            section: session.section,
            deviceInfo: {
                fingerprint: studentData.fingerprint,
                webRTCIPs: studentData.webRTCIPs,
                userAgent: studentData.userAgent,
                ipAddress: studentData.ipAddress
            }
        };

        try {
            // Atomic operation - create join record
            await SessionJoin.create(joinData);

            // Atomic operation - increment counter
            const updatedSession = await QRSession.findOneAndUpdate(
                { sessionId },
                { $inc: { studentsJoinedCount: 1 } },
                { new: true }
            );

            // Update cache with new counter
            this.activeSessions.set(sessionId, updatedSession);

            return {
                success: true,
                message: 'Successfully joined the session. Wait for faculty to start attendance.',
                sessionData: {
                    sessionId,
                    status: session.status,
                    canScanQR: session.status === 'active',
                    joinedAt: new Date(),
                    facultyId: session.facultyId,
                    studentsJoined: updatedSession.studentsJoinedCount
                }
            };

        } catch (err) {
            // Handle duplicate key error (student already joined)
            if (err.code === 11000) {
                return {
                    success: true,
                    message: 'You have already joined this session',
                    alreadyJoined: true,
                    sessionData: {
                        sessionId,
                        status: session.status,
                        canScanQR: session.status === 'active',
                        facultyId: session.facultyId,
                        studentsJoined: session.studentsJoinedCount
                    }
                };
            }
            throw err;
        }
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

        // Optimized: Check if student joined the session using new collection
        const joinedStudent = await SessionJoin.findOne({
            sessionId: session.sessionId,
            studentId: studentData.studentId
        });

        if (!joinedStudent) {
            throw new Error('You must join the session first');
        }

        // Optimized: Check if student already marked attendance using new collection
        const existingAttendance = await SessionAttendance.findOne({
            sessionId: session.sessionId,
            studentId: studentData.studentId
        });

        if (existingAttendance) {
            throw new Error('Attendance already marked for this session');
        }

        // 🚀 OPTIMIZED: Fingerprint validation using cached device ID from User schema
        const storedDeviceId = await this.getStudentDeviceId(
            studentData.studentId, 
            session.department, 
            session.semester, 
            session.section
        );

        // console.log(
        //     `🔎 Checking fingerprint for ${studentData.name}: stored=${storedDeviceId}, received=${studentData.fingerprint}`
        // );

        // Validate fingerprint against stored device ID
        if (storedDeviceId && storedDeviceId !== studentData.fingerprint) {
            throw new Error('Attendance cannot be marked. Suspicious activity detected !');
        }

        // // If no device ID stored, this is first time - update it ( *** This Case is not possible, because login first time is mandatory****)
        // if (!storedDeviceId) {
        //     console.log(`📱 First time device registration for ${studentData.name}`);
        //     await User.updateOne(
        //         { studentId: studentData.studentId },
        //         { deviceId: studentData.fingerprint }
        //     );
        //     // Update cache
        //     this.deviceCache.set(studentData.studentId, studentData.fingerprint);
        //     this.cacheExpiry.set(studentData.studentId, Date.now() + this.CACHE_TTL);
        // }

        // NOTE: We don't mark token as "used" because multiple students should be able to scan the same QR code
        // Individual duplicate prevention is handled by checking if student already marked attendance

        // Optimized: Prepare attendance data for new collection
        const attendanceData = {
            sessionId: session.sessionId,
            studentId: studentData.studentId,
            studentName: studentData.name,
            rollNumber: studentData.classRollNumber,
            email: studentData.email,
            qrToken: qrToken,
            department: session.department,
            semester: session.semester,
            section: session.section,
            deviceInfo: {
                fingerprint: studentData.fingerprint,
                userAgent: studentData.userAgent,
                ipAddress: studentData.ipAddress
            },
            photoFilename: studentData.photoFilename,
            photoCloudinaryUrl: studentData.photoCloudinaryUrl,
            verificationStatus: 'verified'
        };

        try {
            // Atomic operation - create attendance record
            await SessionAttendance.create(attendanceData);

            // Atomic operation - increment counters
            const updatedSession = await QRSession.findOneAndUpdate(
                { sessionId: session.sessionId },
                { 
                    $inc: { 
                        studentsPresentCount: 1,
                        'analytics.totalQRScans': 1 
                    }
                },
                { new: true }
            );

            // Update cache with new counters
            this.activeSessions.set(session.sessionId, updatedSession);

            console.log(`✅ Attendance marked: ${studentData.name} (${studentData.studentId}) in session ${session.sessionId}`);

            return {
                success: true,
                message: 'Attendance marked successfully!',
                attendanceData: {
                    sessionId: session.sessionId,
                    studentName: studentData.name,
                    rollNumber: studentData.classRollNumber,
                    markedAt: new Date(),
                    status: 'present'
                },
                sessionStats: {
                    totalStudents: session.totalStudents,
                    studentsJoined: updatedSession.studentsJoinedCount,
                    studentsPresent: updatedSession.studentsPresentCount,
                    presentPercentage: Math.round((updatedSession.studentsPresentCount / session.totalStudents) * 100),
                    // Add the actual student data with roll numbers for frontend
                    studentsPresentData: await SessionAttendance.findBySession(session.sessionId, 100)
                }
            };

        } catch (err) {
            // Handle duplicate key error (student already marked attendance)
            if (err.code === 11000) {
                throw new Error('Attendance already marked for this session');
            }
            throw err;
        }
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

        // Optimized: Create final attendance record using new collections
        const presentStudentsData = await SessionAttendance.findBySession(sessionId);
        const presentStudents = presentStudentsData.map(s => s.rollNumber || s.email);
        
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
            presentCount: session.studentsPresentCount,
            absentees: absentees,
            presentStudents: presentStudents,
            sessionType: session.sessionType,
            photoVerificationRequired: session.photoVerificationRequired,
            studentPhotos: presentStudentsData.map(s => ({
                studentId: s.studentId,
                rollNumber: s.rollNumber,
                photoFilename: s.photoFilename,
                photoTimestamp: s.markedAt,
                verificationStatus: s.verificationStatus
            }))
        });

        await attendanceRecord.save();

        // 🧹 CLEANUP: Remove session documents from SessionJoin and SessionAttendance collections
        // since they're no longer needed after creating the final attendance record
        try {
            const [joinDeleteResult, attendanceDeleteResult] = await Promise.all([
                SessionJoin.deleteMany({ sessionId }),
                SessionAttendance.deleteMany({ sessionId })
            ]);
        } catch (cleanupError) {
            console.error('⚠️ Error cleaning up session documents:', cleanupError);
            // Don't throw - this is cleanup, not critical for the main flow
        }

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
                studentsJoined: session.studentsJoinedCount,
                studentsPresent: session.studentsPresentCount,
                absentees: absentees.length,
                presentPercentage: Math.round((session.studentsPresentCount / session.totalStudents) * 100),
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
                studentsJoined: session.studentsJoinedCount,
                studentsPresent: session.studentsPresentCount
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
                studentsJoined: session.studentsJoinedCount,
                studentsPresent: session.studentsPresentCount
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
                studentsJoined: session.studentsJoinedCount,
                studentsPresent: session.studentsPresentCount,
                createdAt: session.createdAt,
                currentQRToken: session.currentQRToken,
                qrTokenExpiry: session.qrTokenExpiry,
                canLock: session.canJoin(),
                canStartAttendance: session.canStartAttendance(),
                isActive: session.isActive()
            }))
        };
    }

    /**
     * Get optimized session statistics with student data
     * @param {string} sessionId - Session ID
     * @returns {Object} - Session statistics with student data
     */
    async getSessionStatsOptimized(sessionId) {
        const session = await this.getSessionById(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Get students present with roll numbers (optimized query)
        const studentsPresent = await SessionAttendance.findBySession(sessionId, 100);
        
        return {
            sessionId: session.sessionId,
            totalStudents: session.totalStudents,
            totalJoined: session.studentsJoinedCount,
            totalPresent: session.studentsPresentCount,
            presentPercentage: session.totalStudents > 0 ? 
                Math.round((session.studentsPresentCount / session.totalStudents) * 100) : 0,
            studentsPresent: studentsPresent.map(student => ({
                studentName: student.studentName,
                rollNumber: student.rollNumber,
                markedAt: student.markedAt
            })),
            status: session.status
        };
    }

    /**
     * Get all sessions with optimized stats for faculty dashboard
     * @param {string} facultyId - Faculty ID
     * @returns {Array} - Array of sessions with stats
     */
    async getAllSessionsWithStatsOptimized(facultyId) {
        const sessions = await QRSession.find({ facultyId })
            .select('sessionId facultyId department semester section totalStudents status studentsJoinedCount studentsPresentCount createdAt endedAt')
            .sort({ createdAt: -1 })
            .limit(50); // Limit for performance

        return sessions.map(session => ({
            sessionId: session.sessionId,
            department: session.department,
            semester: session.semester,
            section: session.section,
            totalStudents: session.totalStudents,
            studentsJoined: session.studentsJoinedCount,
            studentsPresent: session.studentsPresentCount,
            presentPercentage: session.totalStudents > 0 ? 
                Math.round((session.studentsPresentCount / session.totalStudents) * 100) : 0,
            status: session.status,
            createdAt: session.createdAt,
            endedAt: session.endedAt,
            // Optimized flags
            canLock: session.canJoin(),
            canStartAttendance: session.canStartAttendance(),
            isActive: session.isActive()
        }));
    }

    /**
     * Cleanup old session data (maintenance method)
     * @param {number} daysOld - Days old to cleanup (default 7)
     */
    async cleanupOldSessionData(daysOld = 7) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        
        // Get ended sessions older than cutoff
        const oldSessions = await QRSession.find({
            status: 'ended',
            endedAt: { $lt: cutoffDate }
        }).select('sessionId');

        const sessionIds = oldSessions.map(s => s.sessionId);
        
        if (sessionIds.length > 0) {
            // Delete associated join and attendance records
            const joinDeleted = await SessionJoin.deleteMany({ 
                sessionId: { $in: sessionIds } 
            });
            
            const attendanceDeleted = await SessionAttendance.deleteMany({ 
                sessionId: { $in: sessionIds } 
            });
        }
        
        return {
            sessionsProcessed: sessionIds.length,
            joinRecordsDeleted: sessionIds.length > 0 ? (await SessionJoin.deleteMany({ sessionId: { $in: sessionIds } })).deletedCount : 0,
            attendanceRecordsDeleted: sessionIds.length > 0 ? (await SessionAttendance.deleteMany({ sessionId: { $in: sessionIds } })).deletedCount : 0
        };
    }
}

// Create singleton instance
const qrSessionService = new QRSessionService();

module.exports = qrSessionService;
