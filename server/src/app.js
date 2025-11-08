const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const attendanceService = require('./services/attendanceService');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const reportRoutes = require('./routes/reportRoutes');
const sheetMappingRoutes = require('./routes/sheetMappingRoutes');
const attendanceRecordRoutes = require('./routes/attendanceRecordRoutes');
const photoVerificationRoutes = require('./routes/photoVerificationRoutes');
const facultyAssignmentRoutes = require('./routes/facultyAssignmentRoutes');
const studentAttendanceRoutes = require('./routes/studentAttendanceRoutes');
const qrAttendanceRoutes = require('./routes/qrAttendanceRoutes');
const qrSessionService = require('./services/qrSessionService');
const GroupSession = require('./models/GroupSession');
const qrTokenService = require('./services/qrTokenService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const photoVerificationService = require('./services/photoVerificationService'); // Import photoVerificationService
const auth = require('./middleware/auth'); // Import auth middleware

const app = express();
const server = http.createServer(app);

// Production security enhancements
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:3000"],
            imgSrc: ["'self'", "data:", "blob:"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        },
    },
}));

// Configure CORS with proper origin
const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Add custom middleware to ensure proper JSON responses
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(body) {
        res.setHeader('Content-Type', 'application/json');
        return originalJson.call(this, body);
    };
    next();
});

const io = new Server(server, {
    cors: corsOptions
});

// Setup cluster adapter for Socket.IO if running in cluster mode
const cluster = require('cluster');
if (cluster.isWorker) {
    const { setupWorker } = require('@socket.io/sticky');
    const { createAdapter } = require('@socket.io/cluster-adapter');
    
    // Setup cluster adapter for inter-process communication
    io.adapter(createAdapter());
    
    // Setup worker for sticky sessions
    setupWorker(io);
    
    console.log(`🔧 Worker ${process.pid} configured with cluster adapter`);
}

// Initialize QR session service with socket.io instance
qrSessionService.setSocketIO(io);

// Sample course data (you can replace this with database queries)
const courses = [
    { id: 'CSE201', name: 'Data Structures' },
    { id: 'CSE301', name: 'Database Management' },
    { id: 'CSE401', name: 'Software Engineering' },
    // Add your courses here
    { id: 'ECE101', name: 'Basic Electronics' },
    { id: 'MECH101', name: 'Engineering Mechanics' },
    { id: 'CIVIL101', name: 'Structural Engineering' }
];

const sections = ['A', 'B', 'C', 'D', 'E', 'F'];

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve the temp-photos directory for photo access
app.use('/temp-photos', express.static(path.join(__dirname, '../temp-photos')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', facultyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sheet-mappings', sheetMappingRoutes);
app.use('/api/attendance', attendanceRecordRoutes);
app.use('/api/photo-verification', photoVerificationRoutes);
app.use('/api/qr-attendance', qrAttendanceRoutes);

// MongoDB connection with proper options for cluster mode
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 20, // Increase for cluster mode (10 per worker)
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Register the code regeneration callback with the attendanceService
attendanceService.setCodeRegenerationCallback((data) => {
    // This will be called whenever codes are auto-refreshed
    if (io) {
        io.emit('updateGrid', {
            grid: data.grid,
            department: data.department,
            semester: data.semester,
            section: data.section,
            autoRefreshed: true // Flag to indicate this was an automatic refresh
        });
    }
});

// API routes for course and section data
app.get('/api/courses', (req, res) => {
    res.json(courses);
});

app.get('/api/sections', (req, res) => {
    res.json(sections);
});

// Socket.IO Connection Handling with JWT Authentication
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication token is required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return next(new Error('User not found'));
        }

        // Attach user to socket for later use
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Invalid authentication token'));
    }
});

io.on('connection', (socket) => {
    // Join users to their specific rooms
    if (socket.user.role === 'faculty') {
        console.log('👤 Faculty connected:', socket.user.name);
        socket.join(`faculty-${socket.user.facultyId}`);
        console.log(`Faculty ${socket.user.facultyId} joined faculty room`);
        
        // Faculty also joins section rooms for all their teaching assignments
        if (socket.user.teachingAssignments && socket.user.teachingAssignments.length > 0) {
            socket.user.teachingAssignments.forEach(assignment => {
                const sectionRoom = `${assignment.semester}-${assignment.section}`;
                socket.join(sectionRoom);
            });
        }
    } else if (socket.user.role === 'student') {
        // Students join section room for session updates
        const sectionRoom = `${socket.user.course}-${socket.user.semester}-${socket.user.section}`;
        socket.join(sectionRoom);
    }

    // ==================== QR ATTENDANCE SOCKET HANDLERS ====================
    
    // QR Session Management Events
    socket.on('qr-startSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can start QR sessions');
            }

            const sessionData = {
                department: data.department,
                semester: data.semester,
                section: data.section,
                totalStudents: parseInt(data.totalStudents),
                sessionType: data.sessionType || 'roll'
            };

            const facultyData = {
                facultyId: socket.user.facultyId,
                name: socket.user.name,
                email: socket.user.email
            };

            const result = await qrSessionService.startSession(sessionData, facultyData);

            // Emit to faculty
            socket.emit('qr-sessionStarted', result);

            // Notify all students in this section with standardized format
            const roomName = `${data.department}-${data.semester}-${data.section}`;
            const sessionStatusData = {
                sessionId: result.sessionId,
                status: 'created',
                canJoin: true,
                canScanQR: false,
                facultyName: socket.user.name,
                department: data.department,
                semester: data.semester,
                section: data.section,
                message: 'New session started - you can join now!'
            };
            
            socket.to(roomName).emit('qr-sessionStarted', sessionStatusData);
            socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);

        } catch (error) {
            console.error('QR Start session error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    socket.on('qr-lockSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can lock QR sessions');
            }

            const result = await qrSessionService.lockSession(data.sessionId, socket.user.facultyId);

            // Emit to faculty
            socket.emit('qr-sessionLocked', result);

            // Notify all students - remove join button with standardized format
            const roomName = `${result.sessionData.department}-${result.sessionData.semester}-${result.sessionData.section}`;
            const sessionStatusData = {
                sessionId: data.sessionId,
                status: 'locked',
                canJoin: false,
                canScanQR: false,
                facultyName: result.sessionData.facultyName || 'Faculty',
                department: result.sessionData.department,
                semester: result.sessionData.semester,
                section: result.sessionData.section,
                message: 'Session locked by faculty'
            };
            
            socket.to(roomName).emit('qr-sessionLocked', sessionStatusData);
            socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);

        } catch (error) {
            console.error('QR Lock session error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    socket.on('qr-unlockSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can unlock QR sessions');
            }

            const result = await qrSessionService.unlockSession(data.sessionId, socket.user.facultyId);

            // Emit to faculty
            socket.emit('qr-sessionUnlocked', result);

            // Notify all students - show join button again with standardized format
            const roomName = `${result.sessionData.department}-${result.sessionData.semester}-${result.sessionData.section}`;
            const sessionStatusData = {
                sessionId: data.sessionId,
                status: 'created',
                canJoin: true,
                canScanQR: false,
                facultyName: result.sessionData.facultyName || 'Faculty',
                department: result.sessionData.department,
                semester: result.sessionData.semester,
                section: result.sessionData.section,
                message: 'Session unlocked - you can join again'
            };
            
            socket.to(roomName).emit('qr-sessionUnlocked', sessionStatusData);
            socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);

        } catch (error) {
            console.error('QR Unlock session error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    socket.on('qr-broadcastJoinSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can broadcast join session');
            }

            // Get session data to find the room
            const session = await qrSessionService.getSessionById(data.sessionId);
            if (!session) {
                throw new Error('Session not found');
            }

            // Verify faculty owns this session
            if (session.facultyId !== socket.user.facultyId) {
                throw new Error('You can only broadcast for your own sessions');
            }

            // Only allow broadcasting for 'created' status sessions
            if (session.status !== 'created') {
                throw new Error('Can only broadcast join notifications for created sessions');
            }

            // Emit to faculty confirming broadcast
            socket.emit('qr-joinSessionBroadcasted', {
                success: true,
                sessionId: data.sessionId,
                message: 'Join session notification sent to all students'
            });

            // Notify all students in this section
            const roomName = `${session.department}-${session.semester}-${session.section}`;
            
            const joinNotificationData = {
                success: true,
                hasActiveSession: true,
                sessionId: session.sessionId,
                status: session.status,
                canJoin: true,
                canScanQR: false,
                hasJoined: false,
                hasMarkedAttendance: false,
                facultyName: session.facultyName,
                department: session.department,
                semester: session.semester,
                section: session.section,
                message: '📢 Faculty has opened the session - you can now join!'
            };
            
            socket.to(roomName).emit('qr-joinSessionAvailable', joinNotificationData);
            socket.to(roomName).emit('sessionStatusUpdate', joinNotificationData);

            console.log(`📢 Join session broadcasted by ${socket.user.name} for session: ${data.sessionId}`);

        } catch (error) {
            console.error('QR Broadcast join session error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    socket.on('qr-startAttendance', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can start QR attendance');
            }

            const result = await qrSessionService.startAttendance(data.sessionId, socket.user.facultyId);

            // Emit to faculty with QR data
            socket.emit('qr-attendanceStarted', result);

            // Notify students who joined - they can now scan QR with standardized format
            const roomName = `${result.sessionData.department}-${result.sessionData.semester}-${result.sessionData.section}`;
            const sessionStatusData = {
                sessionId: data.sessionId,
                status: 'active',
                canJoin: false,
                canScanQR: true,
                facultyName: result.sessionData.facultyName || 'Faculty',
                department: result.sessionData.department,
                semester: result.sessionData.semester,
                section: result.sessionData.section,
                message: 'Attendance started - scan QR code now!'
            };
            
            socket.to(roomName).emit('qr-attendanceStarted', sessionStatusData);
            socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);

            console.log(`📱 QR Attendance started: ${data.sessionId}`);

        } catch (error) {
            console.error('QR Start attendance error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // ========== NEW MOBILE APP SOCKET HANDLERS ==========

    // Handle student joining session via socket (for mobile app)
    socket.on('joinSession', async (data) => {
        try {
            if (socket.user.role !== 'student') {
                throw new Error('Only students can join sessions');
            }

            const { sessionId } = data;
            const studentData = {
                studentId: socket.user.studentId,
                name: socket.user.name,
                classRollNumber: socket.user.classRollNumber,
                email: socket.user.email,
                course: socket.user.course,
                semester: socket.user.semester,
                section: socket.user.section,
                fingerprint: data.fingerprint || 'socket-connection',
                webRTCIPs: data.webRTCIPs || [],
                userAgent: socket.handshake.headers['user-agent'],
                ipAddress: socket.handshake.headers['x-forwarded-for'] || socket.handshake.address
            };

            const result = await qrSessionService.joinSession(sessionId, studentData);

            // Send success response to student
            socket.emit('sessionJoined', {
                success: true,
                message: result.message,
                sessionData: result.sessionData
            });

            // Notify faculty about student joining (only if not already joined)
            if (result.sessionData && result.sessionData.facultyId) {
                const facultyRoom = `faculty-${result.sessionData.facultyId}`;
                socket.to(facultyRoom).emit('qr-studentJoined', {
                    studentName: studentData.name,
                    rollNumber: studentData.classRollNumber,
                    joinedAt: new Date(),
                    totalJoined: result.sessionData.studentsJoined
                });
            }

            // console.log(`✅ Student joined session via socket: ${studentData.name} (${studentData.classRollNumber})`);

        } catch (error) {
            console.error('Join session error:', error);
            socket.emit('sessionJoinError', { message: error.message });
        }
    });

    socket.on('qr-endSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can end QR sessions');
            }

            const result = await qrSessionService.endSession(data.sessionId, socket.user.facultyId);

            // Emit to faculty
            socket.emit('qr-sessionEnded', result);

            // Notify all students
            const roomName = `${result.finalStats.department}-${result.finalStats.semester}-${result.finalStats.section}`;
            socket.to(roomName).emit('qr-sessionEnded', {
                sessionId: data.sessionId,
                message: 'Attendance session has ended',
                finalStats: result.finalStats
            });

            // Emit standardized event for mobile app
            const sectionRoom = `${result.finalStats.department}-${result.finalStats.semester}-${result.finalStats.section}`;
            const sessionStatusData = {
                sessionId: data.sessionId,
                status: 'ended',
                canJoin: false,
                canScanQR: false,
                facultyName: socket.user.name,
                department: result.finalStats.department,
                semester: result.finalStats.semester,
                section: result.finalStats.section,
                message: 'Attendance session has ended'
            };
            
            socket.to(sectionRoom).emit('sessionStatusUpdate', sessionStatusData);

        } catch (error) {
            console.error('QR End session error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // QR Token Refresh Event (for real-time QR updates)
    socket.on('qr-requestRefresh', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty can request QR refresh');
            }

            const newQRData = await qrSessionService.refreshQRToken(data.sessionId);

            if (newQRData) {
                socket.emit('qr-tokenRefreshed', newQRData);
            }

        } catch (error) {
            console.error('QR Refresh error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // ==================== GROUP SESSION SOCKET HANDLERS ====================
    
    // Group Session Start - Wrapper that calls individual startSession for each section
    socket.on('qr-startGroupSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can start group QR sessions');
            }

            const { sections } = data; // Array of section objects with {department, semester, section, totalStudents}
            if (!sections || !Array.isArray(sections) || sections.length === 0) {
                throw new Error('At least one section must be selected for group session');
            }

            const facultyData = {
                facultyId: socket.user.facultyId,
                name: socket.user.name,
                email: socket.user.email
            };

            // Create group session record
            const groupSessionId = uuidv4();
            const individualSessions = [];

            // Start individual sessions for each section
            for (const sectionData of sections) {
                const sessionData = {
                    department: sectionData.department,
                    semester: sectionData.semester,
                    section: sectionData.section,
                    totalStudents: parseInt(sectionData.totalStudents),
                    sessionType: data.sessionType || 'roll'
                };

                // Call existing startSession function
                const result = await qrSessionService.startSession(sessionData, facultyData);
                
                individualSessions.push({
                    sessionId: result.sessionId,
                    department: sectionData.department,
                    semester: sectionData.semester,
                    section: sectionData.section,
                    totalStudents: parseInt(sectionData.totalStudents)
                });

                // Emit existing qr-sessionStarted event for each section (mobile app compatibility)
                const roomName = `${sectionData.department}-${sectionData.semester}-${sectionData.section}`;
                const sessionStatusData = {
                    sessionId: result.sessionId,
                    status: 'created',
                    canJoin: true,
                    canScanQR: false,
                    facultyName: socket.user.name,
                    department: sectionData.department,
                    semester: sectionData.semester,
                    section: sectionData.section,
                    message: 'New session started - you can join now!'
                };
                
                socket.to(roomName).emit('qr-sessionStarted', sessionStatusData);
                socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);
            }

            // Create group session record
            const groupSession = new GroupSession({
                groupSessionId,
                facultyId: socket.user.facultyId,
                facultyName: socket.user.name,
                facultyEmail: socket.user.email,
                sections: individualSessions,
                status: 'created',
                totalStudentsAcrossSections: individualSessions.reduce((sum, s) => sum + s.totalStudents, 0)
            });

            await groupSession.save();

            // Emit to faculty
            socket.emit('qr-groupSessionStarted', {
                success: true,
                groupSessionId,
                status: 'created',
                message: 'Group session started successfully for all sections!',
                groupSessionData: {
                    groupSessionId,
                    sections: individualSessions,
                    status: 'created',
                    totalSections: individualSessions.length,
                    totalStudentsAcrossSections: groupSession.totalStudentsAcrossSections,
                    canLock: true,
                    canStartAttendance: false
                }
            });

            console.log(`✅ Group Session started: ${groupSessionId} for ${individualSessions.length} sections`);

        } catch (error) {
            console.error('Group session start error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // Group Session Lock - Wrapper that calls lockSession for each individual session
    socket.on('qr-lockGroupSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can lock group QR sessions');
            }

            const { groupSessionId } = data;
            const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
            
            if (!groupSession) {
                throw new Error('Group session not found');
            }

            if (groupSession.facultyId !== socket.user.facultyId) {
                throw new Error('Unauthorized: You can only lock your own group sessions');
            }

            if (groupSession.status !== 'created') {
                throw new Error('Group session cannot be locked in current state');
            }

            // Lock each individual session
            for (const sectionInfo of groupSession.sections) {
                await qrSessionService.lockSession(sectionInfo.sessionId, socket.user.facultyId);
                
                // Emit existing qr-sessionLocked event for each section (mobile app compatibility)
                const roomName = `${sectionInfo.department}-${sectionInfo.semester}-${sectionInfo.section}`;
                const sessionStatusData = {
                    sessionId: sectionInfo.sessionId,
                    status: 'locked',
                    canJoin: false,
                    canScanQR: false,
                    facultyName: socket.user.name,
                    department: sectionInfo.department,
                    semester: sectionInfo.semester,
                    section: sectionInfo.section,
                    message: 'Session locked by faculty'
                };
                
                socket.to(roomName).emit('qr-sessionLocked', sessionStatusData);
                socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);
            }

            // Update group session status
            groupSession.status = 'locked';
            groupSession.lockedAt = new Date();
            await groupSession.save();

            // 🚀 GET LIVE REDIS STATS FOR GROUP SESSION LOCK
            const redisStats = await qrSessionService.getGroupSessionStatsFromRedis(groupSessionId);

            // Emit to faculty
            socket.emit('qr-groupSessionLocked', {
                success: true,
                groupSessionId,
                status: 'locked',
                message: 'Group session locked successfully for all sections!',
                groupSessionData: {
                    groupSessionId,
                    sections: groupSession.sections,
                    status: 'locked',
                    canLock: false,
                    canStartAttendance: true,
                    totalStudentsAcrossSections: groupSession.totalStudentsAcrossSections,
                    totalStudentsJoined: redisStats.totalStudentsJoined,
                    totalStudentsPresent: redisStats.totalStudentsPresent,
                    facultyName: groupSession.facultyName,
                    facultyId: groupSession.facultyId
                }
            });
        } catch (error) {
            console.error('Group session lock error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // Group Session Unlock - Wrapper that calls unlockSession for each individual session
    socket.on('qr-unlockGroupSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can unlock group QR sessions');
            }

            const { groupSessionId } = data;
            const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
            
            if (!groupSession) {
                throw new Error('Group session not found');
            }

            if (groupSession.facultyId !== socket.user.facultyId) {
                throw new Error('Unauthorized: You can only unlock your own group sessions');
            }

            if (groupSession.status !== 'locked') {
                throw new Error('Group session is not locked');
            }

            // Unlock each individual session
            for (const sectionInfo of groupSession.sections) {
                await qrSessionService.unlockSession(sectionInfo.sessionId, socket.user.facultyId);
                
                // Emit existing qr-sessionUnlocked event for each section (mobile app compatibility)
                const roomName = `${sectionInfo.department}-${sectionInfo.semester}-${sectionInfo.section}`;
                const sessionStatusData = {
                    sessionId: sectionInfo.sessionId,
                    status: 'created',
                    canJoin: true,
                    canScanQR: false,
                    facultyName: socket.user.name,
                    department: sectionInfo.department,
                    semester: sectionInfo.semester,
                    section: sectionInfo.section,
                    message: 'Session unlocked - you can join again'
                };
                
                socket.to(roomName).emit('qr-sessionUnlocked', sessionStatusData);
                socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);
            }

            // Update group session status
            groupSession.status = 'created';
            groupSession.lockedAt = null;
            await groupSession.save();

            // 🚀 GET LIVE REDIS STATS FOR GROUP SESSION UNLOCK
            const redisStats = await qrSessionService.getGroupSessionStatsFromRedis(groupSessionId);

            // Emit to faculty
            socket.emit('qr-groupSessionUnlocked', {
                success: true,
                groupSessionId,
                status: 'created',
                message: 'Group session unlocked successfully for all sections!',
                groupSessionData: {
                    groupSessionId,
                    sections: groupSession.sections,
                    status: 'created',
                    canLock: true,
                    canStartAttendance: false,
                    totalStudentsAcrossSections: groupSession.totalStudentsAcrossSections,
                    totalStudentsJoined: redisStats.totalStudentsJoined,
                    totalStudentsPresent: redisStats.totalStudentsPresent,
                    facultyName: groupSession.facultyName,
                    facultyId: groupSession.facultyId
                }
            });

        } catch (error) {
            console.error('Group session unlock error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // Group Session Broadcast Join - Wrapper that calls broadcastJoinSession for each individual session
    socket.on('qr-broadcastJoinGroupSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can broadcast join for group sessions');
            }

            const { groupSessionId } = data;
            const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
            
            if (!groupSession) {
                throw new Error('Group session not found');
            }

            if (groupSession.facultyId !== socket.user.facultyId) {
                throw new Error('Unauthorized: You can only broadcast for your own group sessions');
            }

            if (groupSession.status !== 'created') {
                throw new Error('Can only broadcast join notifications for created group sessions');
            }

            // Broadcast join for each individual session
            for (const sectionInfo of groupSession.sections) {
                // Emit existing qr-joinSessionBroadcasted event for each section (mobile app compatibility)
                const roomName = `${sectionInfo.department}-${sectionInfo.semester}-${sectionInfo.section}`;
                
                const joinNotificationData = {
                    success: true,
                    hasActiveSession: true,
                    sessionId: sectionInfo.sessionId,
                    status: 'created',
                    canJoin: true,
                    canScanQR: false,
                    hasJoined: false,
                    hasMarkedAttendance: false,
                    facultyName: socket.user.name,
                    department: sectionInfo.department,
                    semester: sectionInfo.semester,
                    section: sectionInfo.section,
                    message: '📢 Faculty has opened the session - you can now join!'
                };
                
                socket.to(roomName).emit('qr-joinSessionAvailable', joinNotificationData);
                socket.to(roomName).emit('sessionStatusUpdate', joinNotificationData);
            }

            // Emit to faculty
            socket.emit('qr-groupJoinSessionBroadcasted', {
                success: true,
                groupSessionId,
                message: 'Join session notification sent to all students in all sections'
            });

            console.log(`📢 Group join session broadcasted by ${socket.user.name} for group: ${groupSessionId}`);

        } catch (error) {
            console.error('Group session broadcast join error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // Group Session Start Attendance - Wrapper that generates single QR and calls startAttendance for each session
    socket.on('qr-startGroupAttendance', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can start group attendance');
            }

            const { groupSessionId } = data;
            const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
            
            if (!groupSession) {
                throw new Error('Group session not found');
            }

            if (groupSession.facultyId !== socket.user.facultyId) {
                throw new Error('Unauthorized: You can only start attendance for your own group sessions');
            }

            if (groupSession.status !== 'locked') {
                throw new Error('Group session must be locked before starting attendance');
            }

            // Generate single group QR token for all sections
            const groupQRData = await qrTokenService.generateGroupQRToken({
                groupSessionId: groupSessionId,
                facultyId: socket.user.facultyId,
                sections: groupSession.sections
            });

            // Start attendance for each individual session and apply the group QR token
            for (const sectionInfo of groupSession.sections) {
                await qrSessionService.startAttendance(sectionInfo.sessionId, socket.user.facultyId);
                
                // Stop individual QR refresh to avoid conflicts with group QR refresh
                qrSessionService.stopQRRefresh(sectionInfo.sessionId);
                
                // Update individual session with group QR token
                const QRSession = require('./models/QRSession');
                await QRSession.updateOne(
                    { sessionId: sectionInfo.sessionId },
                    { 
                        currentQRToken: groupQRData.token,
                        qrTokenExpiry: groupQRData.expiryTime,
                        qrRefreshCount: 1
                    }
                );
                
                // Emit existing qr-attendanceStarted event for each section (mobile app compatibility)
                const roomName = `${sectionInfo.department}-${sectionInfo.semester}-${sectionInfo.section}`;
                const sessionStatusData = {
                    sessionId: sectionInfo.sessionId,
                    status: 'active',
                    canJoin: false,
                    canScanQR: true,
                    facultyName: socket.user.name,
                    department: sectionInfo.department,
                    semester: sectionInfo.semester,
                    section: sectionInfo.section,
                    message: 'Attendance started - scan QR code now!'
                };
                
                socket.to(roomName).emit('qr-attendanceStarted', sessionStatusData);
                socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);
            }

            // Update group session status
            groupSession.status = 'active';
            groupSession.startedAt = new Date();
            groupSession.currentGroupQRToken = groupQRData.token;
            groupSession.qrTokenExpiry = groupQRData.expiryTime;
            groupSession.qrRefreshCount = 1;
            await groupSession.save();

            // Start Group QR refresh interval (every 5 seconds)
            qrSessionService.startGroupQRRefresh(groupSessionId);

            // 🚀 GET LIVE REDIS STATS FOR GROUP ATTENDANCE START
            const redisStats = await qrSessionService.getGroupSessionStatsFromRedis(groupSessionId);

            // Emit to faculty with group QR data
            socket.emit('qr-groupAttendanceStarted', {
                success: true,
                groupSessionId,
                status: 'active',
                message: 'Group attendance started successfully for all sections!',
                qrData: {
                    token: groupQRData.token,
                    expiryTime: groupQRData.expiryTime,
                    refreshCount: 1,
                    timerSeconds: 5
                },
                groupSessionData: {
                    groupSessionId,
                    sections: groupSession.sections,
                    status: 'active',
                    totalSections: groupSession.sections.length,
                    totalStudentsAcrossSections: groupSession.totalStudentsAcrossSections,
                    totalStudentsJoined: redisStats.totalStudentsJoined,
                    totalStudentsPresent: redisStats.totalStudentsPresent,
                    facultyName: groupSession.facultyName,
                    facultyId: groupSession.facultyId
                }
            });

            console.log(`📱 Group QR Attendance started: ${groupSessionId} with single QR token`);

        } catch (error) {
            console.error('Group session start attendance error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // Group Session End - Wrapper that calls endSession for each individual session
    socket.on('qr-endGroupSession', async (data) => {
        try {
            if (socket.user.role !== 'faculty') {
                throw new Error('Only faculty members can end group QR sessions');
            }

            const { groupSessionId } = data;
            const groupSession = await GroupSession.findByGroupSessionId(groupSessionId);
            
            if (!groupSession) {
                throw new Error('Group session not found');
            }

            if (groupSession.facultyId !== socket.user.facultyId) {
                throw new Error('Unauthorized: You can only end your own group sessions');
            }

            if (groupSession.status === 'ended') {
                throw new Error('Group session already ended');
            }

            let totalJoined = 0;
            let totalPresent = 0;
            const sectionResults = [];

            // End each individual session
            for (const sectionInfo of groupSession.sections) {
                const result = await qrSessionService.endSession(sectionInfo.sessionId, socket.user.facultyId);
                
                totalJoined += result.finalStats.studentsJoined;
                totalPresent += result.finalStats.studentsPresent;
                
                sectionResults.push({
                    department: sectionInfo.department,
                    semester: sectionInfo.semester,
                    section: sectionInfo.section,
                    totalStudents: sectionInfo.totalStudents,
                    studentsJoined: result.finalStats.studentsJoined,
                    studentsPresent: result.finalStats.studentsPresent,
                    presentPercentage: result.finalStats.presentPercentage
                });
                
                // Emit existing qr-sessionEnded event for each section (mobile app compatibility)
                const roomName = `${sectionInfo.department}-${sectionInfo.semester}-${sectionInfo.section}`;
                const sessionStatusData = {
                    sessionId: sectionInfo.sessionId,
                    status: 'ended',
                    canJoin: false,
                    canScanQR: false,
                    facultyName: socket.user.name,
                    department: sectionInfo.department,
                    semester: sectionInfo.semester,
                    section: sectionInfo.section,
                    message: 'Attendance session has ended'
                };
                
                socket.to(roomName).emit('qr-sessionEnded', {
                    sessionId: sectionInfo.sessionId,
                    message: 'Attendance session has ended',
                    finalStats: result.finalStats
                });
                socket.to(roomName).emit('sessionStatusUpdate', sessionStatusData);
            }

            // Update group session status
            groupSession.status = 'ended';
            groupSession.endedAt = new Date();
            groupSession.totalStudentsJoined = totalJoined;
            groupSession.totalStudentsPresent = totalPresent;
            await groupSession.save();

            // Stop Group QR refresh interval
            qrSessionService.stopGroupQRRefresh(groupSessionId);

            // Emit to faculty with aggregated stats
            socket.emit('qr-groupSessionEnded', {
                success: true,
                groupSessionId,
                message: 'Group session ended successfully for all sections!',
                finalStats: {
                    totalSections: groupSession.sections.length,
                    totalStudentsAcrossSections: groupSession.totalStudentsAcrossSections,
                    totalStudentsJoined: totalJoined,
                    totalStudentsPresent: totalPresent,
                    overallPresentPercentage: Math.round((totalPresent / groupSession.totalStudentsAcrossSections) * 100),
                    sectionResults: sectionResults,
                    sessionDuration: Math.round((groupSession.endedAt - groupSession.createdAt) / 1000 / 60) // minutes
                }
            });

            console.log(`🏁 Group Session ended: ${groupSessionId} for ${groupSession.sections.length} sections`);

        } catch (error) {
            console.error('Group session end error:', error);
            socket.emit('qr-error', { message: error.message });
        }
    });

    // ==================== END GROUP SESSION HANDLERS ====================

    // ==================== MOBILE APP SOCKET HANDLERS ====================

    // Handle session status requests (for mobile app)
    socket.on('getSessionStatus', async () => {
        try {
            // Only handle for students - faculty doesn't need this
            if (socket.user.role !== 'student') {
                return; // Just ignore, don't throw error
            }

            const sessionStatus = await qrSessionService.getStudentSessionStatus(
                socket.user.course,
                socket.user.semester,
                socket.user.section,
                socket.user.studentId
            );

            socket.emit('sessionStatusUpdate', sessionStatus);

        } catch (error) {
            console.error('Get session status error:', error);
            socket.emit('sessionStatusError', { message: error.message });
        }
    });

    // ==================== END MOBILE APP HANDLERS ====================

    socket.on('disconnect', () => {
        if(socket.user.role=='faculty'){
            console.log('👋 Faculty disconnected:', socket.user.name);
        }
    });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Attendance System API' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Faculty routes
app.use('/api/faculty', facultyRoutes);

// Faculty assignment routes (for admin)
app.use('/api/admin', facultyAssignmentRoutes);

// Student attendance routes
app.use('/api/student/attendance', studentAttendanceRoutes);

// Admin route to check server status
app.get('/api/status', async (req, res) => {
    const redisCache = require('./services/redisCache');
    
    res.json({
        status: 'online',
        time: new Date().toISOString(),
        uptime: process.uptime(),
        cluster: {
            isWorker: cluster.isWorker,
            workerId: cluster.worker ? cluster.worker.id : 'master'
        },
        redis: redisCache.getStatus()
    });
});

// Start server - Only if not running in cluster mode
// In cluster mode, the master process handles the listening
// Note: cluster is already declared at line 70
if (!cluster.isWorker) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(` Server running on port ${PORT}`);
    });
} else {
    // Worker process - don't listen, just export the server for cluster master
    console.log(` Worker ${process.pid} ready (not listening on port)`);
}