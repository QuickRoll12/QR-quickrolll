const QRSession = require('../models/QRSession');
const SessionJoin = require('../models/SessionJoin');
const SessionAttendance = require('../models/SessionAttendance');
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');
const qrTokenService = require('./qrTokenService');
const redisCache = require('./redisCache');
const { v4: uuidv4 } = require('uuid');
const cluster = require('cluster');

class QRSessionService {
    constructor() {
        // Keep existing in-memory caches for backward compatibility
        this.activeSessions = new Map(); // In-memory cache for active sessions
        this.qrRefreshIntervals = new Map(); // Store interval IDs for QR refresh
        this.groupQRRefreshIntervals = new Map(); // Store interval IDs for Group QR refresh
        this.io = null; // Socket.io instance for real-time updates
        
        // 🚀 REDIS OPTIMIZED: Use Redis for shared caching
        this.CACHE_TTL = 5 * 60; // 5 minutes cache TTL in seconds
        this.cacheHits = 0; // Track cache performance
        this.cacheMisses = 0;
        
        // Start periodic cache cleanup (every 6 minutes) - Only master process
        if (!cluster.isWorker) {
            setInterval(() => {
                this.clearExpiredCache();
            }, 6 * 60 * 1000);
        }
    }

    /**
     * Set the socket.io instance for real-time updates
     * @param {Object} io - Socket.io instance
     */
    setSocketIO(io) {
        this.io = io;
    }

    /**
     * 🚀 REDIS OPTIMIZED: Get device ID for a student with Redis caching
     * @param {string} studentId - Student ID
     * @param {string} department - Department
     * @param {string} semester - Semester  
     * @param {string} section - Section
     * @returns {string|null} - Device ID or null
     */
    async getStudentDeviceId(studentId, department, semester, section) {
        const deviceCacheKey = `device:${studentId}`;
        const sectionCacheKey = `section:${department}-${semester}-${section}`;

        // Check individual device cache first (fastest)
        let deviceId = await redisCache.get(deviceCacheKey);
        if (deviceId) {
            this.cacheHits++;
            return deviceId;
        }

        // Check section cache (batch cache)
        let sectionCache = await redisCache.get(sectionCacheKey);
        if (sectionCache && sectionCache[studentId]) {
            deviceId = sectionCache[studentId];
            // Cache individually for faster future access
            await redisCache.set(deviceCacheKey, deviceId, this.CACHE_TTL);
            this.cacheHits++;
            return deviceId;
        }

        // Cache miss - fetch from database
        this.cacheMisses++;
        
        try {
            // Fetch all students in this section at once (batch optimization)
            const sectionStudents = await User.find({
                course: department,
                semester: semester,
                section: section,
                role: 'student'
            }).select('studentId deviceId').lean();

            // Create section cache object
            const newSectionCache = {};
            sectionStudents.forEach(student => {
                if (student.deviceId) {
                    newSectionCache[student.studentId] = student.deviceId;
                }
            });

            // Cache the entire section in Redis
            await redisCache.set(sectionCacheKey, newSectionCache, this.CACHE_TTL);

            // Cache individual device ID
            deviceId = newSectionCache[studentId] || null;
            if (deviceId) {
                await redisCache.set(deviceCacheKey, deviceId, this.CACHE_TTL);
            }

            return deviceId;

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
        const sectionKey = `section:${session.department}-${session.semester}-${session.section}`;
        
        // Check if already cached in Redis
        const existingCache = await redisCache.exists(sectionKey);
        if (existingCache) {
            return;
        }

        // This will populate the cache
        await this.getStudentDeviceId('dummy', session.department, session.semester, session.section);
    }

    /**
     * Clear expired cache entries (called periodically) - Redis handles TTL automatically
     */
    clearExpiredCache() {
        // Redis handles TTL automatically, but we can do cleanup here if needed
    }

    /**
     * Get active session from cache
     * @param {string} sessionId - Session ID
     * @returns {Object|null} - Session data or null
     */
    async getActiveSession(sessionId) {
        const cacheKey = `session:${sessionId}`;
        return await redisCache.get(cacheKey);
    }

    /**
     * Set active session in cache
     * @param {string} sessionId - Session ID
     * @param {Object} sessionData - Session data
     */
    async setActiveSession(sessionId, sessionData) {
        const cacheKey = `session:${sessionId}`;
        await redisCache.set(cacheKey, sessionData, this.CACHE_TTL);
    }

    /**
     * Remove active session from cache
     * @param {string} sessionId - Session ID
     */
    async removeActiveSession(sessionId) {
        const cacheKey = `session:${sessionId}`;
        await redisCache.del(cacheKey);
    }

    /**
     * Get cache statistics for monitoring
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            activeSessionsSize: this.activeSessions.size,
            cacheTTL: this.CACHE_TTL / 60, // minutes
            cacheHitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
            redisStatus: redisCache.getStatus()
        };
    }

    /**
     * Force refresh cache for a specific section
     * @param {string} department - Department
     * @param {string} semester - Semester
     * @param {string} section - Section
     */
    async refreshSectionCache(department, semester, section) {
        const sectionKey = `section:${department}-${semester}-${section}`;
        
        // Clear existing Redis cache
        await redisCache.del(sectionKey);
        
        // Reload cache
        await this.getStudentDeviceId('dummy', department, semester, section);
    }

    // ==================== 🚀 SESSION JOIN CACHE METHODS ====================
    
    /**
     * Add student to session join cache
     * @param {string} sessionId - Session ID
     * @param {string} studentId - Student ID
     * @returns {boolean} - Success status
     */
    async addStudentToSessionCache(sessionId, studentId) {
        try {
            const redis = redisCache.getClient();
            
            // 🚀 PIPELINE OPTIMIZATION: Combine sAdd and expire operations
            const pipeline = redis.multi();
            pipeline.sAdd(`session:${sessionId}:joined`, studentId);
            pipeline.expire(`session:${sessionId}:joined`, 7200);
            await pipeline.exec();
            
            return true;
        } catch (error) {
            console.warn('⚠️ Redis session join cache add failed:', error.message);
            return false; // Graceful degradation
        }
    }
    
    /**
     * Check if student has joined session (Redis cache first, DB fallback)
     * @param {string} sessionId - Session ID
     * @param {string} studentId - Student ID
     * @returns {boolean} - Whether student has joined
     */
    async hasStudentJoinedSession(sessionId, studentId) {
        try {
            // 🚀 REDIS CHECK (sub-millisecond)
            const redis = redisCache.getClient();
            const isMember = await redis.sIsMember(`session:${sessionId}:joined`, studentId);
            return isMember;
        } catch (error) {
            console.warn('⚠️ Redis session join check failed, falling back to DB:', error.message);
            
            // 🔄 FALLBACK TO DB (original logic)
            try {
                const joinedStudent = await SessionJoin.findOne({
                    sessionId: sessionId,
                    studentId: studentId
                });
                return !!joinedStudent;
            } catch (dbError) {
                console.error('❌ DB fallback also failed:', dbError);
                return false;
            }
        }
    }
    
    /**
     * Clear session join cache when session ends
     * @param {string} sessionId - Session ID
     */
    async clearSessionJoinCache(sessionId) {
        try {
            const redis = redisCache.getClient();
            await redis.del(`session:${sessionId}:joined`);
        } catch (error) {
            console.warn('⚠️ Redis session join cache clear failed:', error.message);
            // Not critical - cache will expire naturally
        }
    }
    
    // ==================== 🚀 SESSION ATTENDANCE CACHE METHODS ====================
    
    /**
     * Add student roll number to session attendance cache
     * @param {string} sessionId - Session ID
     * @param {string} rollNumber - Student roll number
     * @returns {boolean} - Success status
     */
    async addStudentToAttendanceCache(sessionId, rollNumber) {
        try {
            const redis = redisCache.getClient();
            
            // 🚀 PIPELINE OPTIMIZATION: Combine sAdd and expire operations
            const pipeline = redis.multi();
            pipeline.sAdd(`session:${sessionId}:attended`, rollNumber);
            pipeline.expire(`session:${sessionId}:attended`, 7200);
            await pipeline.exec();
            
            return true;
        } catch (error) {
            console.warn('⚠️ Redis session attendance cache add failed:', error.message);
            return false; // Graceful degradation
        }
    }
    
    /**
     * Get all attended students roll numbers from cache (Redis first, DB fallback)
     * @param {string} sessionId - Session ID
     * @returns {Array} - Array of roll numbers
     */
    async getAttendedStudentsFromCache(sessionId) {
        try {
            // 🚀 REDIS CHECK (sub-millisecond)
            const redis = redisCache.getClient();
            const rollNumbers = await redis.sMembers(`session:${sessionId}:attended`);
            return rollNumbers.sort(); // Sort roll numbers for consistency
        } catch (error) {
            console.warn('⚠️ Redis attendance cache check failed, falling back to DB:', error.message);
            
            // 🔄 FALLBACK TO DB (original logic)
            try {
                const presentStudentsData = await SessionAttendance.findBySession(sessionId);
                return presentStudentsData.map(s => s.rollNumber || s.email).sort();
            } catch (dbError) {
                console.error('❌ DB fallback also failed:', dbError);
                return [];
            }
        }
    }
    
    /**
     * Get attended students stats from cache for getSessionStatsOptimized (Redis first, DB fallback)
     * @param {string} sessionId - Session ID
     * @param {number} limit - Limit number of results (default 100)
     * @returns {Array} - Array of student objects with name and roll number
     */
    async getAttendedStudentsStatsFromCache(sessionId, limit = 100) {
        try {
            // 🚀 REDIS CHECK (sub-millisecond)
            const redis = redisCache.getClient();
            const rollNumbers = await redis.sMembers(`session:${sessionId}:attended`);
            
            // Convert roll numbers to student objects format (limited data from cache)
            const limitedRollNumbers = rollNumbers.sort().slice(0, limit);
            return limitedRollNumbers.map(rollNumber => ({
                studentName: `Student ${rollNumber}`, // Simplified name from cache
                rollNumber: rollNumber,
                markedAt: new Date() // Approximate timestamp
            }));
        } catch (error) {
            console.warn('⚠️ Redis attendance stats cache check failed, falling back to DB:', error.message);
            
            // 🔄 FALLBACK TO DB (original logic)
            try {
                return await SessionAttendance.findBySession(sessionId, limit);
            } catch (dbError) {
                console.error('❌ DB fallback also failed:', dbError);
                return [];
            }
        }
    }

    /**
     * Get session stats from Redis cache (joined and attended counts)
     * @param {string} sessionId - Session ID
     * @returns {Object} - Stats object with counts from Redis
     */
    async getSessionStatsFromRedis(sessionId) {
        try {
            const redis = redisCache.getClient();
            
            // 🚀 PIPELINE OPTIMIZATION: Batch both sCard operations
            const pipeline = redis.multi();
            pipeline.sCard(`session:${sessionId}:joined`);
            pipeline.sCard(`session:${sessionId}:attended`);
            const results = await pipeline.exec();
            
            // Handle both [error, result] and direct result formats
            const joinedCount = Array.isArray(results[0]) ? (results[0][1] || 0) : (results[0] || 0);
            const attendedCount = Array.isArray(results[1]) ? (results[1][1] || 0) : (results[1] || 0);
            
            return {
                studentsJoined: joinedCount,
                studentsPresent: attendedCount
            };
        } catch (error) {
            console.warn('⚠️ Redis stats fetch failed, falling back to DB counts:', error.message);
            
            // Fallback to database counts if Redis fails
            try {
                const session = await this.getSessionById(sessionId);
                return {
                    studentsJoined: session?.studentsJoinedCount || 0,
                    studentsPresent: session?.studentsPresentCount || 0
                };
            } catch (dbError) {
                console.error('❌ DB fallback for stats also failed:', dbError);
                return {
                    studentsJoined: 0,
                    studentsPresent: 0
                };
            }
        }
    }

    /**
     * Get group session stats from Redis cache (aggregated across all sections)
     * @param {string} groupSessionId - Group Session ID
     * @returns {Object} - Aggregated stats object
     */
    async getGroupSessionStatsFromRedis(groupSessionId) {
        try {
            const GroupSession = require('../models/GroupSession');
            const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
            
            if (!groupSession) {
                throw new Error('Group session not found');
            }
            
            let totalJoined = 0;
            let totalPresent = 0;
            let totalStudents = 0;
            
            // Aggregate stats from all sessions in the group
            for (const section of groupSession.sections) {
                const sessionStats = await this.getSessionStatsFromRedis(section.sessionId);
                totalJoined += sessionStats.studentsJoined;
                totalPresent += sessionStats.studentsPresent;
                
                // Get total students for this section
                const session = await this.getSessionById(section.sessionId);
                totalStudents += session?.totalStudents || 0;
            }
            
            
            return {
                totalStudentsJoined: totalJoined,
                totalStudentsPresent: totalPresent,
                totalStudents: totalStudents,
                totalSections: groupSession.sections.length,
                presentPercentage: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0
            };
        } catch (error) {
            console.error('❌ Redis group stats fetch failed:', error);
            
            // Fallback to database aggregation
            try {
                const GroupSession = require('../models/GroupSession');
                const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
                
                if (!groupSession) {
                    return {
                        totalStudentsJoined: 0,
                        totalStudentsPresent: 0,
                        totalStudents: 0,
                        totalSections: 0,
                        presentPercentage: 0
                    };
                }
                
                let totalJoined = 0;
                let totalPresent = 0;
                let totalStudents = 0;
                
                for (const section of groupSession.sections) {
                    const session = await this.getSessionById(section.sessionId);
                    if (session) {
                        totalJoined += session.studentsJoinedCount || 0;
                        totalPresent += session.studentsPresentCount || 0;
                        totalStudents += session.totalStudents || 0;
                    }
                }
                
                return {
                    totalStudentsJoined: totalJoined,
                    totalStudentsPresent: totalPresent,
                    totalStudents: totalStudents,
                    totalSections: groupSession.sections.length,
                    presentPercentage: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0
                };
            } catch (dbError) {
                console.error('❌ DB fallback for group stats also failed:', dbError);
                return {
                    totalStudentsJoined: 0,
                    totalStudentsPresent: 0,
                    totalStudents: 0,
                    totalSections: 0,
                    presentPercentage: 0
                };
            }
        }
    }
    
    /**
     * Check if student has marked attendance (Redis cache first, DB fallback)
     * @param {string} sessionId - Session ID
     * @param {string} studentId - Student ID
     * @returns {boolean} - Whether student has marked attendance
     */
    async hasStudentMarkedAttendance(sessionId, classRollNumber) {
        try {
            // For Redis, we need to get the student's roll number
            // Since we store roll numbers in Redis attendance cache
            // const User = require('../models/User');
            // const student = await User.findOne({ studentId });
            // if (!student) return false;
            
            const rollNumber = classRollNumber;
            
            // 🚀 REDIS CHECK (sub-millisecond)
            const redis = redisCache.getClient();
            const hasAttended = await redis.sIsMember(`session:${sessionId}:attended`, rollNumber);
            return hasAttended;
        } catch (error) {
            console.warn('⚠️ Redis attendance check failed, falling back to DB:', error.message);
            
            // 🔄 FALLBACK TO DB (original logic)
            try {
                const SessionAttendance = require('../models/SessionAttendance');
                const attendanceRecord = await SessionAttendance.findOne({
                    sessionId: sessionId,
                    rollNumber: classRollNumber
                });
                return !!attendanceRecord;
            } catch (dbError) {
                console.error('❌ DB fallback also failed:', dbError);
                return false;
            }
        }
    }

    /**
     * Clear session attendance cache when session ends
     * @param {string} sessionId - Session ID
     */
    async clearSessionAttendanceCache(sessionId) {
        try {
            const redis = redisCache.getClient();
            await redis.del(`session:${sessionId}:attended`);
            console.log(`🧹 Cleared attendance cache for session ${sessionId}`);
        } catch (error) {
            console.warn('⚠️ Redis session attendance cache clear failed:', error.message);
            // Not critical - cache will expire naturally
        }
    }

    /**
     * � PIPELINE OPTIMIZATION: Clear both session caches efficiently
     * @param {string} sessionId - Session ID
     */
    async clearAllSessionCaches(sessionId) {
        try {
            const redis = redisCache.getClient();
            
            // 🚀 PIPELINE OPTIMIZATION: Clear both caches in one operation
            const pipeline = redis.multi();
            pipeline.del(`session:${sessionId}:joined`);
            pipeline.del(`session:${sessionId}:attended`);
            await pipeline.exec();
            
            console.log(`🧹 Cleared all caches for session ${sessionId}`);
        } catch (error) {
            console.warn('⚠️ Redis session cache clear failed:', error.message);
            // Not critical - cache will expire naturally
        }
    }

    /**
     * � PROXY DETECTION: Remove student from session caches
     * This method is called by the proxy detection system to remove flagged students
     * @param {string} sessionId - Session ID
     * @param {string} studentId - Student ID (for join cache)
     * @param {string} rollNumber - Student roll number (for attendance cache)
     * @returns {Object} - Removal result
     */
    async removeStudentFromSession(sessionId, studentId, rollNumber) {
        try {
            if (!redisCache.isHealthy()) {
                return {
                    success: false,
                    error: 'Redis cache not available',
                    joinCacheRemoved: false,
                    attendanceCacheRemoved: false
                };
            }

            const redis = redisCache.getClient();
            
            // 🚀 PIPELINE OPTIMIZATION: Batch both sRem operations
            const pipeline = redis.multi();
            pipeline.sRem(`session:${sessionId}:joined`, studentId);
            pipeline.sRem(`session:${sessionId}:attended`, rollNumber);
            const results = await pipeline.exec();
            
            const joinRemoved = results[0][1];
            const attendanceRemoved = results[1][1];
            
            console.log(`🚨 PROXY REMOVAL: Session ${sessionId} - Student ${studentId}/${rollNumber} - Join: ${joinRemoved > 0}, Attendance: ${attendanceRemoved > 0}`);
            
            return {
                success: true,
                joinCacheRemoved: joinRemoved > 0,
                attendanceCacheRemoved: attendanceRemoved > 0,
                message: `Removed from ${(joinRemoved > 0 ? 1 : 0) + (attendanceRemoved > 0 ? 1 : 0)} cache(s)`
            };
            
        } catch (error) {
            console.error(`❌ Failed to remove student ${studentId}/${rollNumber} from session ${sessionId}:`, error);
            return {
                success: false,
                error: error.message,
                joinCacheRemoved: false,
                attendanceCacheRemoved: false
            };
        }
    }

    /**
     * 🔍 PROXY DETECTION: Check if student is in session caches
     * @param {string} sessionId - Session ID
     * @param {string} studentId - Student ID
     * @param {string} rollNumber - Student roll number
     * @returns {Object} - Student status in caches
     */
    async checkStudentInSession(sessionId, studentId, rollNumber) {
        try {
            if (!redisCache.isHealthy()) {
                return {
                    success: false,
                    error: 'Redis cache not available'
                };
            }

            const redis = redisCache.getClient();
            
            // 🚀 PIPELINE OPTIMIZATION: Batch both sIsMember operations
            const pipeline = redis.multi();
            pipeline.sIsMember(`session:${sessionId}:joined`, studentId);
            pipeline.sIsMember(`session:${sessionId}:attended`, rollNumber);
            const results = await pipeline.exec();
            
            const isInJoinCache = results[0][1];
            const isInAttendanceCache = results[1][1];
            
            return {
                success: true,
                isInJoinCache,
                isInAttendanceCache,
                wouldBeCounted: isInAttendanceCache, // This determines final attendance
                message: `Student ${isInAttendanceCache ? 'WILL' : 'will NOT'} be counted in final attendance`
            };
            
        } catch (error) {
            console.error(`❌ Failed to check student ${studentId}/${rollNumber} in session ${sessionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
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

        // 🚀 GET LIVE REDIS STATS FOR LOCK RESPONSE
        const redisStats = await this.getSessionStatsFromRedis(sessionId);

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
                studentsJoinedCount: redisStats.studentsJoined,
                studentsPresentCount: redisStats.studentsPresent,
                facultyName: session.facultyName,
                facultyId: session.facultyId,
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

        // 🚀 GET LIVE REDIS STATS FOR UNLOCK RESPONSE
        const redisStats = await this.getSessionStatsFromRedis(sessionId);

        return {
            success: true,
            message: 'Session unlocked successfully',
            sessionData: {
                sessionId: session.sessionId,
                status: session.status,
                studentsJoinedCount: redisStats.studentsJoined,
                studentsPresentCount: redisStats.studentsPresent,
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
        const tokenData = await qrTokenService.generateQRToken({
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
    // async joinSession(sessionId, studentData) {
    //     const session = await this.getSessionById(sessionId);
        
    //     if (!session) {
    //         throw new Error('Session not found');
    //     }

    //     if (!session.canJoin()) {
    //         throw new Error('Session is locked. You cannot join at this time.');
    //     }

    //     // Check if student belongs to this section
    //     if (studentData.course !== session.department || 
    //         studentData.semester !== session.semester || 
    //         studentData.section !== session.section) {
    //         throw new Error('You are not enrolled in this section');
    //     }

    //     // Optimized join data preparation
    //     // const joinData = {
    //     //     sessionId,
    //     //     studentId: studentData.studentId,
    //     //     studentName: studentData.name,
    //     //     rollNumber: studentData.classRollNumber,
    //     //     email: studentData.email,
    //     //     department: session.department,
    //     //     semester: session.semester,
    //     //     section: session.section,
    //     //     deviceInfo: {
    //     //         fingerprint: studentData.fingerprint,
    //     //         webRTCIPs: studentData.webRTCIPs,
    //     //         userAgent: studentData.userAgent,
    //     //         ipAddress: studentData.ipAddress
    //     //     }
    //     // };

    //     try {
    //         // Atomic operation - create join record
    //         // await SessionJoin.create(joinData); (If you want you can uncomment the code to join the record in the database.)

    //         // 🚀 PIPELINE OPTIMIZATION: Combine session join and stats retrieval
    //         const redis = redisCache.getClient();
    //         const pipeline = redis.multi();
            
    //         // Add student to join cache with TTL
    //         pipeline.sAdd(`session:${sessionId}:joined`, studentData.studentId);
    //         pipeline.expire(`session:${sessionId}:joined`, 7200);
            
    //         // Get current stats in same pipeline
    //         pipeline.sCard(`session:${sessionId}:joined`);
    //         pipeline.sCard(`session:${sessionId}:attended`);
            
    //         const results = await pipeline.exec();
            
    //         // Extract results - handle both [error, result] and direct result formats
    //         const joinedCount = Array.isArray(results[2]) ? (results[2][1] || 0) : (results[2] || 0);
    //         const attendedCount = Array.isArray(results[3]) ? (results[3][1] || 0) : (results[3] || 0);

    //         const redisStats = {
    //             studentsJoined: joinedCount,
    //             studentsPresent: attendedCount
    //         };

    //         // Get session without incrementing counter (for cache update)
    //         const updatedSession = await this.getSessionById(sessionId);

    //         // Update cache with session data
    //         this.activeSessions.set(sessionId, updatedSession);

    //         return {
    //             success: true,
    //             message: 'Successfully joined the session. Wait for faculty to start attendance.',
    //             sessionData: {
    //                 sessionId,
    //                 status: session.status,
    //                 canScanQR: session.status === 'active',
    //                 joinedAt: new Date(),
    //                 facultyId: session.facultyId,
    //                 studentsJoined: redisStats.studentsJoined
    //             }
    //         };
    //     } catch (err) {
    //         // Handle duplicate key error (student already joined)
    //         if (err.code === 11000) {
    //             return {
    //                 success: true,
    //                 message: 'You have already joined this session',
    //                 alreadyJoined: true,
    //                 sessionData: {
    //                     sessionId,
    //                     status: session.status,
    //                     canScanQR: session.status === 'active',
    //                     facultyId: session.facultyId,
    //                     studentsJoined: session.studentsJoinedCount
    //                 }
    //             };
    //         }
    //         throw err;
    //     }
    // }

    // /**
    //  * Mark attendance via QR scan
    //  * @param {string} qrToken - QR token from scan
    //  * @param {Object} studentData - Student information
    //  * @returns {Object} - Attendance result
    //  */
    // async markAttendance(qrToken, studentData) {
    //     // Validate QR token (pass student data for group token validation)
    //     const tokenValidation = await qrTokenService.validateQRToken(qrToken, studentData);
    //     if (!tokenValidation.valid) {
    //         throw new Error(tokenValidation.error);
    //     }

    //     const { sessionData: tokenSessionData } = tokenValidation;
    //     const session = await this.getSessionById(tokenSessionData.sessionId);

    //     if (!session) {
    //         throw new Error('Session not found');
    //     }

    //     // Check if student belongs to this section
    //     if (studentData.course !== session.department || 
    //         studentData.semester !== session.semester || 
    //         studentData.section !== session.section) {
    //         throw new Error('You are not enrolled in this section');
    //     }

    //     // 🚀 STEP 1: Check if student has joined (must be done first)
    //     const redis = redisCache.getClient();
    //     const hasJoined = await redis.sIsMember(`session:${session.sessionId}:joined`, studentData.studentId);
        
    //     if (!hasJoined) {
    //         throw new Error('You must join the session first');
    //     }

    //     // Optimized: Check if student already marked attendance using new collection
    //     // const existingAttendance = await SessionAttendance.findOne({
    //     //     sessionId: session.sessionId,
    //     //     studentId: studentData.studentId
    //     // });

    //     // if (existingAttendance) {
    //     //     throw new Error('Attendance already marked for this session');
    //     // }

    //     // 🚀 OPTIMIZED: Fingerprint validation using cached device ID from User schema
    //     const storedDeviceId = await this.getStudentDeviceId(
    //         studentData.studentId, 
    //         session.department, 
    //         session.semester, 
    //         session.section
    //     );

    //     // console.log(
    //     //     `🔎 Checking fingerprint for ${studentData.name}: stored=${storedDeviceId}, received=${studentData.fingerprint}`
    //     // );

    //     // Validate fingerprint against stored device ID
    //     if (storedDeviceId && storedDeviceId !== studentData.fingerprint) {
    //         throw new Error('Attendance cannot be marked. Suspicious activity detected !');
    //     }

    //     // // If no device ID stored, this is first time - update it ( *** This Case is not possible, because login first time is mandatory****)
    //     // if (!storedDeviceId) {
    //     //     console.log(`📱 First time device registration for ${studentData.name}`);
    //     //     await User.updateOne(
    //     //         { studentId: studentData.studentId },
    //     //         { deviceId: studentData.fingerprint }
    //     //     );
    //     //     // Update cache
    //     //     this.deviceCache.set(studentData.studentId, studentData.fingerprint);
    //     //     this.cacheExpiry.set(studentData.studentId, Date.now() + this.CACHE_TTL);
    //     // }

    //     // NOTE: We don't mark token as "used" because multiple students should be able to scan the same QR code
    //     // Individual duplicate prevention is handled by checking if student already marked attendance

    //     // Optimized: Prepare attendance data for new collection
    //     // const attendanceData = {
    //     //     sessionId: session.sessionId,
    //     //     studentId: studentData.studentId,
    //     //     studentName: studentData.name,
    //     //     rollNumber: studentData.classRollNumber,
    //     //     email: studentData.email,
    //     //     qrToken: qrToken,
    //     //     department: session.department,
    //     //     semester: session.semester,
    //     //     section: session.section,
    //     //     deviceInfo: {
    //     //         fingerprint: studentData.fingerprint,
    //     //         userAgent: studentData.userAgent,
    //     //         ipAddress: studentData.ipAddress
    //     //     },
    //     //     photoFilename: studentData.photoFilename,
    //     //     photoCloudinaryUrl: studentData.photoCloudinaryUrl,
    //     //     verificationStatus: 'verified'
    //     // };

    //     try {
    //         // await SessionAttendance.create(attendanceData);

    //         // 🚀 PIPELINE OPTIMIZATION: Add to attendance cache and get stats after all validations pass
    //         const pipeline = redis.multi();
            
    //         // Add to attendance cache with TTL
    //         pipeline.sAdd(`session:${session.sessionId}:attended`, studentData.classRollNumber);
    //         pipeline.expire(`session:${session.sessionId}:attended`, 7200);
            
    //         // Get updated stats
    //         pipeline.sCard(`session:${session.sessionId}:joined`);
    //         pipeline.sCard(`session:${session.sessionId}:attended`);
            
    //         const results = await pipeline.exec();
            
    //         // Extract stats - handle both [error, result] and direct result formats
    //         const joinedCount = Array.isArray(results[2]) ? (results[2][1] || 0) : (results[2] || 0);
    //         const attendedCount = Array.isArray(results[3]) ? (results[3][1] || 0) : (results[3] || 0);
            
    //         const redisStats = {
    //             studentsJoined: joinedCount,
    //             studentsPresent: attendedCount
    //         };

    //         // Get session without incrementing counter (for cache update)
    //         const updatedSession = await this.getSessionById(session.sessionId);

    //         // Update cache with session data
    //         this.activeSessions.set(session.sessionId, updatedSession);

    //         return {
    //             success: true,
    //             message: 'Attendance marked successfully!',
    //             attendanceData: {
    //                 sessionId: session.sessionId,
    //                 studentName: studentData.name,
    //                 rollNumber: studentData.classRollNumber,
    //                 markedAt: new Date(),
    //                 status: 'present'
    //             },
    //             sessionStats: {
    //                 totalStudents: session.totalStudents,
    //                 studentsJoined: redisStats.studentsJoined,
    //                 studentsPresent: redisStats.studentsPresent,
    //                 presentPercentage: session.totalStudents > 0 ? Math.round((redisStats.studentsPresent / session.totalStudents) * 100) : 0,
    //             }
    //         };

    //     } catch (err) {
    //         // Handle duplicate key error (student already marked attendance)
    //         if (err.code === 11000) {
    //             throw new Error('Attendance already marked for this session');
    //         }
    //         throw err;
    //     }
    // }

    /**
 * Student joins a session
 * @param {string} sessionId - Session ID
 * @param {Object} studentData - Student information
 * @returns {Object} - Join result
 */
async joinSession(sessionId, studentData) {
    const at = performance.now();
    const session = await this.getSessionById(sessionId);
    const getSessionByIdTime = performance.now() - at;
    console.log(`[Join session]Get session by ID took: ${getSessionByIdTime} ms`);
    
    if (!session) {
        throw new Error('Session not found');
    }

    if (!session.canJoin()) {
        throw new Error('Session is locked. You cannot join at this time.');
    }

    const bt = performance.now();
    // Check if student belongs to this section
    if (studentData.course !== session.department || 
        studentData.semester !== session.semester || 
        studentData.section !== session.section) {
        throw new Error('You are not enrolled in this section');
    }
    const ct = performance.now();
    const sectionCheckTime = ct - bt;
    console.log(`[Join session]Section check took: ${sectionCheckTime} ms`);

    // ... [joinData preparation is commented out, which is fine] ...

    try {
        // ... [SessionJoin.create is commented out, which is fine] ...

        // 🚀 PIPELINE OPTIMIZATION: Combine session join and stats retrieval
        // --- ADDED: Start timer ---
        const pipelineStartTime = performance.now();
        const redis = redisCache.getClient();
        const pipeline = redis.multi();
        
        // Add student to join cache with TTL
        pipeline.sAdd(`session:${sessionId}:joined`, studentData.studentId);
        pipeline.expire(`session:${sessionId}:joined`, 7200);
        
        // Get current stats in same pipeline
        pipeline.sCard(`session:${sessionId}:joined`);
        pipeline.sCard(`session:${sessionId}:attended`);
        
        const results = await pipeline.exec();
        
        // --- ADDED: End timer and log duration ---
        const pipelineEndTime = performance.now();
        const pipelineDurationMs = pipelineEndTime - pipelineStartTime;
        console.log(`[joinSession] Redis pipeline execution took: ${pipelineDurationMs.toFixed(2)} ms`);
        
        const dt = performance.now();
        // Extract results - handle both [error, result] and direct result formats
        const joinedCount = Array.isArray(results[2]) ? (results[2][1] || 0) : (results[2] || 0);
        const attendedCount = Array.isArray(results[3]) ? (results[3][1] || 0) : (results[3] || 0);
        const extractResultsTime = performance.now() - dt;
        console.log(`[joinSession] Extract results took: ${extractResultsTime.toFixed(2)} ms`);

        const redisStats = {
            studentsJoined: joinedCount,
            studentsPresent: attendedCount
        };

        const et = performance.now();
        // Get session without incrementing counter (for cache update)
        const updatedSession = await this.getSessionById(sessionId);
        const getSessionByIdTime = performance.now() - et;
        console.log(`[joinSession] Updating session by ID took: ${getSessionByIdTime.toFixed(2)} ms`);

        const ft = performance.now();
        // Update cache with session data
        this.activeSessions.set(sessionId, updatedSession);
        const updateCacheTime = performance.now() - ft;
        console.log(`[joinSession] Updating cache took: ${updateCacheTime.toFixed(2)} ms`);

        return {
            success: true,
            message: 'Successfully joined the session. Wait for faculty to start attendance.',
            sessionData: {
                sessionId,
                status: session.status,
                canScanQR: session.status === 'active',
                joinedAt: new Date(),
                facultyId: session.facultyId,
                studentsJoined: redisStats.studentsJoined
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
    // Validate QR token (pass student data for group token validation)
    const at = performance.now();
    const tokenValidation = await qrTokenService.validateQRToken(qrToken, studentData);
    if (!tokenValidation.valid) {
        throw new Error(tokenValidation.error);
    }
    const tokenValidationTime = performance.now() - at;
    console.log(`[Mark attendance]Token validation took: ${tokenValidationTime} ms`);

    const bt = performance.now();

    const { sessionData: tokenSessionData } = tokenValidation;
    const session = await this.getSessionById(tokenSessionData.sessionId);

    if (!session) {
        throw new Error('Session not found');
    }
    const getSessionByIdTime = performance.now() - bt;
    console.log(`[Mark attendance]Get session by ID took: ${getSessionByIdTime} ms`);

    const ct = performance.now();
    // Check if student belongs to this section
    if (studentData.course !== session.department || 
        studentData.semester !== session.semester || 
        studentData.section !== session.section) {
        throw new Error('You are not enrolled in this section');
    }
    const sectionCheckTime = performance.now() - ct;
    console.log(`[Mark attendance]Section check took: ${sectionCheckTime} ms`);

    const dt = performance.now();
    // 🚀 STEP 1: Check if student has joined (must be done first)
    const redis = redisCache.getClient();
    const hasJoined = await redis.sIsMember(`session:${session.sessionId}:joined`, studentData.studentId);
    
    if (!hasJoined) {
        throw new Error('You must join the session first');
    }
    const hasJoinedTime = performance.now() - dt;
    console.log(`[Mark attendance]Has joined check took: ${hasJoinedTime} ms`);

    const et = performance.now();
    // ... [existingAttendance check is commented out, which is fine] ...

    // 🚀 OPTIMIZED: Fingerprint validation using cached device ID from User schema
    const storedDeviceId = await this.getStudentDeviceId(
        studentData.studentId, 
        session.department, 
        session.semester, 
        session.section
    );
    const getStudentDeviceIdTime = performance.now() - et;
    console.log(`[Mark attendance]Get student device ID took: ${getStudentDeviceIdTime} ms`);

    const ft = performance.now();
    // Validate fingerprint against stored device ID
    if (storedDeviceId && storedDeviceId !== studentData.fingerprint) {
        throw new Error('Attendance cannot be marked. Suspicious activity detected !');
    }
    const fingerprintCheckTime = performance.now() - ft;
    console.log(`[Mark attendance]Fingerprint check took: ${fingerprintCheckTime} ms`);

    // ... [First time device registration is commented out, which is fine] ...
    // ... [attendanceData preparation is commented out, which is fine] ...

    try {
        // ... [SessionAttendance.create is commented out, which is fine] ...

        // 🚀 PIPELINE OPTIMIZATION: Add to attendance cache and get stats after all validations pass
        // --- ADDED: Start timer ---
        const pipelineStartTime = performance.now();
        const pipeline = redis.multi();
        
        // Add to attendance cache with TTL
        pipeline.sAdd(`session:${session.sessionId}:attended`, studentData.classRollNumber);
        pipeline.expire(`session:${session.sessionId}:attended`, 7200);
        
        // Get updated stats
        pipeline.sCard(`session:${session.sessionId}:joined`);
        pipeline.sCard(`session:${session.sessionId}:attended`);
        
        
        const results = await pipeline.exec();
        
        // --- ADDED: End timer and log duration ---
        const pipelineEndTime = performance.now();
        const pipelineDurationMs = pipelineEndTime - pipelineStartTime;
        console.log(`[markAttendance] Redis pipeline execution took: ${pipelineDurationMs.toFixed(2)} ms`);
        
        // Extract stats - handle both [error, result] and direct result formats
        const joinedCount = Array.isArray(results[2]) ? (results[2][1] || 0) : (results[2] || 0);
        const attendedCount = Array.isArray(results[3]) ? (results[3][1] || 0) : (results[3] || 0);
        
        const redisStats = {
            studentsJoined: joinedCount,
            studentsPresent: attendedCount
        };

        // Get session without incrementing counter (for cache update)
        const updatedSession = await this.getSessionById(session.sessionId);

        // Update cache with session data
        this.activeSessions.set(session.sessionId, updatedSession);

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
                studentsJoined: redisStats.studentsJoined,
                studentsPresent: redisStats.studentsPresent,
                presentPercentage: session.totalStudents > 0 ? Math.round((redisStats.studentsPresent / session.totalStudents) * 100) : 0,
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
        await qrTokenService.invalidateSessionTokens(sessionId);

        // const presentStudentsData = await SessionAttendance.findBySession(sessionId);
        // const presentStudents = presentStudentsData.map(s => s.rollNumber || s.email);

        // 🚀 GET FROM REDIS CACHE (replaces SessionAttendance.findBySession)
        const presentStudents = await this.getAttendedStudentsFromCache(sessionId);
        
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
            studentPhotos: [] // 🚀 Simplified - photo data not cached in Redis for performance
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
        
        // 🚀 CLEAR REDIS CACHES (new optimization)
        await this.clearSessionJoinCache(sessionId);
        await this.clearSessionAttendanceCache(sessionId);
        
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
    async getSessionStatus(department, semester, section, studentId, classRollNumber) {
        const session = await QRSession.findActiveSessionForSection(department, semester, section);
        
        if (!session) {
            return {
                hasActiveSession: false,
                canJoin: false,
                canScanQR: false,
                message: 'No active session found for your section'
            };
        }

        const hasJoined = await this.hasStudentJoinedSession(session.sessionId, studentId);
        const hasMarkedAttendance = await this.hasStudentMarkedAttendance(session.sessionId, classRollNumber);

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
     * Get status message for students
     * @param {string} status - Session status
     * @param {boolean} hasJoined - Whether student has joined
     * @param {boolean} hasMarkedAttendance - Whether student has marked attendance
     * @returns {string} - Status message
     */
    getStatusMessage(status, hasJoined, hasMarkedAttendance) {
        if (hasMarkedAttendance) {
            return 'Attendance marked successfully!';
        }
        
        switch (status) {
            case 'created':
                return hasJoined ? 'Wait for faculty to lock session' : 'Click Join to enter attendance area';
            case 'locked':
                return hasJoined ? 'Wait for faculty to start attendance' : 'Session locked - cannot join';
            case 'active':
                return hasJoined ? 'Scan QR code to mark attendance' : 'Session active but you haven\'t joined';
            case 'ended':
                return 'Session has ended';
            default:
                return 'Unknown session status';
        }
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
        console.log(`🔄 QR refresh started for session ${sessionId}`);
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
        const tokenData = await qrTokenService.generateQRToken({
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

        // 🚀 GET FROM REDIS CACHE (replaces SessionAttendance.findBySession)
        const studentsPresent = await this.getAttendedStudentsStatsFromCache(sessionId, 100);
        
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
            joinRecordsDeleted: joinDeleted.deletedCount,
            attendanceRecordsDeleted: attendanceDeleted.deletedCount
        };
    }

    // ==================== GROUP SESSION OPTIMIZATION METHODS ====================

    /**
     * Sync Redis group count to MongoDB (called periodically)
     */
    async syncGroupCountToDB(groupSessionId, currentCount) {
        try {
            const GroupSession = require('../models/GroupSession');
            await GroupSession.findOneAndUpdate(
                { groupSessionId },
                { totalStudentsJoined: currentCount }
            );
            // console.log(`🔄 Synced group ${groupSessionId} count to DB: ${currentCount}`);
        } catch (error) {
            console.error('Error syncing group count to DB:', error);
        }
    }

    /**
     * Get live group session count by aggregating individual sessions (ULTRA-OPTIMIZED)
     */
    async getGroupSessionLiveCount(groupSessionId) {
        try {
            const GroupSession = require('../models/GroupSession');
            const QRSession = require('../models/QRSession');
            
            // Get group session
            const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
            if (!groupSession) return 0;
            
            // Aggregate counts from individual sessions (single DB query)
            const sessionIds = groupSession.sections.map(s => s.sessionId);
            const sessions = await QRSession.find(
                { sessionId: { $in: sessionIds } },
                { studentsJoinedCount: 1 }
            );
            
            // Sum up all joined counts
            const totalJoined = sessions.reduce((sum, session) => sum + (session.studentsJoinedCount || 0), 0);
            
            return totalJoined;
        } catch (error) {
            console.error('Error getting live group count:', error);
            return 0;
        }
    }

    // ==================== GROUP QR REFRESH METHODS ====================

    /**
     * Start Group QR refresh interval for a group session
     * @param {string} groupSessionId - Group Session ID
     */
    startGroupQRRefresh(groupSessionId) {
        // Clear any existing interval
        this.stopGroupQRRefresh(groupSessionId);

        const intervalId = setInterval(async () => {
            try {
                await this.refreshGroupQRToken(groupSessionId);
            } catch (error) {
                console.error(`Error refreshing Group QR for session ${groupSessionId}:`, error);
                this.stopGroupQRRefresh(groupSessionId);
            }
        }, 5000); // Refresh every 5 seconds

        this.groupQRRefreshIntervals.set(groupSessionId, intervalId);
        // console.log(`🔄 Group QR refresh started for session ${groupSessionId}`);
    }

    /**
     * Stop Group QR refresh interval for a group session
     * @param {string} groupSessionId - Group Session ID
     */
    stopGroupQRRefresh(groupSessionId) {
        const intervalId = this.groupQRRefreshIntervals.get(groupSessionId);
        if (intervalId) {
            clearInterval(intervalId);
            this.groupQRRefreshIntervals.delete(groupSessionId);
            // console.log(`🛑 Group QR refresh stopped for session ${groupSessionId}`);
        }
    }

    /**
     * Refresh Group QR token for a group session
     * @param {string} groupSessionId - Group Session ID
     * @returns {Object} - New Group QR token data
     */
    async refreshGroupQRToken(groupSessionId) {
        const GroupSession = require('../models/GroupSession');
        const QRSession = require('../models/QRSession');
        
        const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
        
        if (!groupSession || groupSession.status !== 'active') {
            this.stopGroupQRRefresh(groupSessionId);
            return null;
        }

        // Generate new group QR token
        const groupQRData = await qrTokenService.generateGroupQRToken({
            groupSessionId: groupSessionId,
            facultyId: groupSession.facultyId,
            sections: groupSession.sections
        });

        // Update group session
        groupSession.currentGroupQRToken = groupQRData.token;
        groupSession.qrTokenExpiry = groupQRData.expiryTime;
        groupSession.qrRefreshCount += 1;
        await groupSession.save();

        // Update all individual sessions with the new group QR token
        for (const sectionInfo of groupSession.sections) {
            await QRSession.updateOne(
                { sessionId: sectionInfo.sessionId },
                { 
                    currentQRToken: groupQRData.token,
                    qrTokenExpiry: groupQRData.expiryTime,
                    qrRefreshCount: groupSession.qrRefreshCount
                }
            );
        }

        const qrData = {
            token: groupQRData.token,
            expiryTime: groupQRData.expiryTime,
            refreshCount: groupSession.qrRefreshCount,
            timerSeconds: 5
        };

        // Emit new Group QR token to connected faculty clients
        if (this.io) {
            const roomName = `faculty-${groupSession.facultyId}`;
            this.io.to(roomName).emit('qr-tokenRefreshed', qrData);
        }

        // console.log(`🔄 Group QR token refreshed for ${groupSessionId}, count: ${groupSession.qrRefreshCount}`);
        return qrData;
    }
}

// Create singleton instance
const qrSessionService = new QRSessionService();

module.exports = qrSessionService;
