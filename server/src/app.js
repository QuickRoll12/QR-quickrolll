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

    // Send available courses and sections to client
    // socket.emit('courseData', { courses, sections });
    
    // // Handle explicit request for course data
    // socket.on('getCourseData', () => {
    //     socket.emit('courseData', { courses, sections });
    // });

    // socket.on('getSessionStatus', ({ department, semester, section }) => {
    //     try {
    //         const status = attendanceService.getSessionStatus(department, semester, section);
    //         socket.emit('sessionStatus', {
    //             active: status.active,
    //             grid: status.grid,
    //             department: status.department,
    //             semester: status.semester,
    //             section: status.section,
    //             totalStudents: status.totalStudents,
    //             photoVerificationRequired: true // Always require photo verification
    //         });
    //     } catch (error) {
    //         console.error('Error getting session status:', error.message);
    //         socket.emit('error', { message: error.message });
    //     }
    // });

    // New event for photo upload
    // socket.on('uploadAttendancePhoto', async ({ department, semester, section, photoData }) => {
        
    //     try {
    //         // Only students can upload photos
    //         if (socket.user.role !== 'student') {
    //             throw new Error('Only students can upload attendance photos');
    //         }
            
    //         // Verify that the department and section match the user's data
    //         if (department !== socket.user.course) {
    //             throw new Error('Department does not match your profile');
    //         }

    //         if (section !== socket.user.section) {
    //             throw new Error('Section does not match your profile');
    //         }
            
    //         // Get student ID and roll number
    //         const studentId = socket.user._id;
    //         const rollNumber = socket.user.classRollNumber;
            
    //         // Save the photo
    //         const photoInfo = await photoVerificationService.savePhoto(
    //             photoData,
    //             department,
    //             semester,
    //             section,
    //             rollNumber || studentId
    //         );
            
    //         // Send success response
    //         socket.emit('photoUploadResponse', {
    //             success: true,
    //             message: 'Photo uploaded successfully',
    //             photoInfo: {
    //                 filename: photoInfo.filename,
    //                 cloudinaryUrl: photoInfo.cloudinaryUrl,
    //                 timestamp: photoInfo.timestamp
    //             }
    //         });
            
    //     } catch (error) {
    //         socket.emit('photoUploadResponse', {
    //             success: false,
    //             message: error.message
    //         });
    //     }
    // });

    // socket.on('startSession', async ({ department, semester, section, totalStudents, sessionType }) => {
    //     console.log(`📝 Starting session - Department: ${department}, Semester: ${semester}, Section: ${section}, Session Type: ${sessionType || 'roll-based'}, Total Students: ${totalStudents}`);
        
    //     try {
    //         // Only faculty can start sessions
    //         if (socket.user.role !== 'faculty') {
    //             throw new Error('Only faculty members can start attendance sessions');
    //         }

    //         // For roll-based sessions, totalStudents is required
    //         if (sessionType !== 'gmail' && (!totalStudents || isNaN(totalStudents) || totalStudents < 1)) {
    //             throw new Error('Please specify a valid number of students');
    //         }

    //         const result = await attendanceService.startSession(department, semester, section, parseInt(totalStudents || 0), sessionType);
    //         // Notify all clients about the new session
    //         io.emit('sessionStatus', {
    //             active: true,
    //             grid: result.grid,
    //             department,
    //             semester,
    //             section,
    //             totalStudents: result.totalStudents,
    //             sessionType: result.sessionType
    //         });
    //     } catch (error) {
    //         console.error('Error starting session:', error.message);
    //         socket.emit('error', { message: error.message });
    //     }
    // });

    // socket.on('markAttendance', async (data) => {
    //     // Determine if this is a roll-based or Gmail-based attendance
    //     const sessionStatus = attendanceService.getSessionStatus(data.department, data.semester, data.section);
    //     const isGmailSession = sessionStatus.sessionType === 'gmail';
            
    //     // Get client IP address - try different socket properties for IP
    //     let ipAddress = socket.handshake.headers['x-forwarded-for'] || 
    //                    socket.handshake.headers['x-real-ip'] ||
    //                    socket.handshake.address;
                       
    //     // If IP is IPv6 localhost, convert to IPv4
    //     if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
    //         ipAddress = '127.0.0.1';
    //     }
        
    //     // Remove IPv6 prefix if present
    //     ipAddress = ipAddress.replace(/^::ffff:/, '');
        
    //     try {
    //         // Only students can mark attendance
    //         if (socket.user.role !== 'student') {
    //             throw new Error('Only students can mark attendance');
    //         }

    //         // For roll-based sessions, verify roll number
    //         if (!isGmailSession && data.rollNumber !== socket.user.classRollNumber) {
    //             throw new Error('Roll number does not match your profile');
    //         }
            
    //         // For Gmail-based sessions, use the user's email from their profile if not provided
    //         let gmail = data.gmail;
    //         if (isGmailSession) {
    //             if (!gmail || gmail.trim() === '') {
    //                 // If no email provided, use the one from the user's profile
    //                 gmail = socket.user.email;
    //             }
    //         }

    //         // Verify that the department and section match the user's data
    //         if (data.department !== socket.user.course) {
    //             throw new Error('Department does not match your profile');
    //         }

    //         if (data.section !== socket.user.section) {
    //             throw new Error('Section does not match your profile');
    //         }
            
    //         // Check if photo verification is required and a photo was provided
    //         if (sessionStatus.photoVerificationRequired && !data.photoFilename) {
    //             throw new Error('Photo verification is required for this session');
    //         }

    //         const result = await attendanceService.markAttendance(
    //             data.department,
    //             data.semester,
    //             data.section,
    //             data.rollNumber,
    //             data.code,
    //             data.fingerprint,
    //             data.webRTCIPs,
    //             socket.user._id,
    //             { 
    //                 ip: ipAddress,
    //                 userName: socket.user.name,
    //                 userAgent: socket.handshake.headers['user-agent'] || 'Unknown'
    //             },
    //             gmail, // Pass the gmail parameter explicitly
    //             data.photoFilename, // Pass the photo filename
    //             data.photoCloudinaryUrl // Pass the Cloudinary URL
    //         );
            
    //         socket.emit('attendanceResponse', {
    //             success: result.success,
    //             message: result.message,
    //             photoVerified: !!data.photoFilename
    //         });

    //         if (result.success) {
    //             io.emit('updateGrid', {
    //                 grid: result.grid,
    //                 department: data.department,
    //                 semester: data.semester,
    //                 section: data.section
    //             });

    //             // Also emit attendance update for live stats (for faculty dashboard)
    //             const attendanceUpdateData = {
    //                 studentName: socket.user.name,
    //                 rollNumber: socket.user.classRollNumber,
    //                 markedAt: new Date(),
    //                 totalPresent: result.presentCount || 0,
    //                 totalJoined: result.totalStudents || 0,
    //                 presentPercentage: result.presentCount && result.totalStudents ? 
    //                     Math.round((result.presentCount / result.totalStudents) * 100) : 0,
    //                 sessionId: `${data.department}-${data.semester}-${data.section}`,
    //                 status: 'active',
    //                 canJoin: true,
    //                 canScanQR: false
    //             };
                
    //             console.log(`📊 Emitting traditional attendance update:`, {
    //                 studentName: attendanceUpdateData.studentName,
    //                 rollNumber: attendanceUpdateData.rollNumber,
    //                 totalPresent: attendanceUpdateData.totalPresent
    //             });
                
    //             // Emit to all connected clients for live stats
    //             io.emit('qr-attendanceUpdate', attendanceUpdateData);
    //         }
    //     } catch (error) {
    //         console.error('Error marking attendance:', error.message);
    //         socket.emit('attendanceResponse', {
    //             success: false,
    //             message: error.message
    //         });
    //     }
    // });

    // socket.on('endSession', async ({ department, semester, section }) => {
    //     console.log(`🛑 Ending session - Department: ${department}, Semester: ${semester}, Section: ${section}`);
        
    //     try {
    //         // Only faculty can end sessions
    //         if (socket.user.role !== 'faculty') {
    //             throw new Error('Only faculty members can end attendance sessions');
    //         }

    //         // Pass the faculty user information to ensure correct faculty data in attendance records
    //         const result = await attendanceService.endSession(department, semester, section, socket.user);
            
    //         // Clean up temporary photos for this session
    //         try {
    //             const deletedCount = await photoVerificationService.deleteSessionPhotos(
    //                 department,
    //                 semester,
    //                 section
    //             );
    //             console.log(`Cleaned up ${deletedCount} photos for session ${department}-${semester}-${section}`);
    //         } catch (photoError) {
    //             console.error('Error cleaning up session photos:', photoError);
    //             // Continue with session end even if photo cleanup fails
    //         }
            
    //         // If this was a Gmail-based session, update the Google Sheet
    //         if (result.sessionType === 'gmail') {
    //             try {
    //                 const { updateAttendanceSheet } = require('./services/googleSheetsService');
                    
    //                 // Create attendance data map for Google Sheets
    //                 const attendanceData = {};
                    
    //                 // Set all students as absent (0) by default
    //                 if (result.allEmails && result.allEmails.length > 0) {
    //                     result.allEmails.forEach(email => {
    //                         if (email && email.trim() !== '') {
    //                             attendanceData[email] = '0';
    //                         }
    //                     });
    //                 }
                    
    //                 // Set present students to 1
    //                 if (result.presentStudents && result.presentStudents.length > 0) {
    //                     result.presentStudents.forEach(email => {
    //                         if (email && email.trim() !== '') {
    //                             attendanceData[email] = '1';
    //                             console.log(`Marking ${email} as present in Google Sheet`);
    //                         }
    //                     });
    //                 }
                    
    //                 // Only update if we have attendance data
    //                 if (Object.keys(attendanceData).length > 0) {
    //                     // Update Google Sheet
    //                     await updateAttendanceSheet(department, semester, section, attendanceData);
    //                     console.log('Google Sheet updated successfully');
    //                 } else {
    //                     console.warn('No attendance data to update in Google Sheet');
    //                 }
    //             } catch (sheetError) {
    //                 console.error('Error updating Google Sheet:', sheetError);
    //                 socket.emit('error', { message: 'Session ended but failed to update Google Sheet: ' + sheetError.message });
    //             }
    //         }
            
    //         // Notify all clients about the session ending
    //         io.emit('sessionEnded', {
    //             success: true,
    //             department,
    //             semester,
    //             section,
    //             totalStudents: result.totalStudents,
    //             presentCount: result.presentCount,
    //             absentees: result.absentees,
    //             presentStudents: result.presentStudents,
    //             sessionType: result.sessionType
    //         });
    //     } catch (error) {
    //         console.error('Error ending session:', error.message);
    //         socket.emit('error', { message: error.message });
    //     }
    // });

    // socket.on('refreshCodes', ({ department, semester, section }) => {
        
    //     try {
    //         // Only faculty can refresh codes
    //         if (socket.user.role !== 'faculty') {
    //             throw new Error('Only faculty members can refresh attendance codes');
    //         }

    //         const result = attendanceService.refreshCodes(department, semester, section);
            
    //         // Notify all clients about the code refresh
    //         io.emit('updateGrid', {
    //             grid: result.grid,
    //             department,
    //             semester,
    //             section
    //         });
    //     } catch (error) {
    //         console.error('Error refreshing codes:', error.message);
    //         socket.emit('error', { message: error.message });
    //     }
    // });

    // Handle full-screen violation - TEMPORARILY COMMENTED OUT FOR TESTING
    /*
    socket.on('fullScreenViolation', async ({ department, semester, section, rollNumber, gmail, fingerprint, webRTCIPs, token, device }) => {
        try {
            // Verify user identity from token
            const userId = socket.user.id;
            
            // Get client IP address - try different socket properties for IP
            let ipAddress = socket.handshake.headers['x-forwarded-for'] || 
                           socket.handshake.headers['x-real-ip'] ||
                           socket.handshake.address;
                           
            // If comma-separated IPs, get the first one (client IP)
            if (ipAddress && ipAddress.includes(',')) {
                ipAddress = ipAddress.split(',')[0].trim();
            }
            
            // Create request object for attendanceService
            const req = {
                ip: ipAddress,
                userName: socket.user.name,
                userAgent: socket.handshake.headers['user-agent'] || ''
            };
            
            // Handle the full-screen violation
            const result = await attendanceService.handleFullScreenViolation(
                department, 
                semester, 
                section, 
                rollNumber, 
                fingerprint, 
                webRTCIPs, 
                userId, 
                req, 
                gmail
            );
            
            // Notify the student about the result
            socket.emit('fullScreenViolationResponse', result);
            
            // If successful, update the grid for all users in the room
            if (result.success) {
                const sessionKey = attendanceService.generateSessionKey(department, semester, section);
                const sessionData = attendanceService.getSessionStatus(department, semester, section);
                
                // Broadcast updated grid to all clients in the room
                socket.to(sessionKey).emit('updateGrid', {
                    grid: sessionData.grid,
                    department,
                    semester,
                    section
                });
            }
        } catch (error) {
            console.error('Error handling full-screen violation:', error.message);
            socket.emit('error', { message: error.message });
        }
    });
    */

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

    // socket.on('qr-joinSession', async (data) => {
    //     try {
    //         if (socket.user.role !== 'student') {
    //             throw new Error('Only students can join QR sessions');
    //         }

    //         const studentData = {
    //             studentId: socket.user.studentId,
    //             name: socket.user.name,
    //             classRollNumber: socket.user.classRollNumber,
    //             email: socket.user.email,
    //             course: socket.user.course,
    //             semester: socket.user.semester,
    //             section: socket.user.section,
    //             fingerprint: data.fingerprint,
    //             webRTCIPs: data.webRTCIPs,
    //             userAgent: socket.handshake.headers['user-agent'],
    //             ipAddress: socket.handshake.headers['x-forwarded-for'] || socket.handshake.address
    //         };

    //         const result = await qrSessionService.joinSession(data.sessionId, studentData);

    //         // Join student to room for real-time updates
    //         const roomName = `${studentData.course}-${studentData.semester}-${studentData.section}`;
    //         socket.join(roomName);

    //         socket.emit('qr-sessionJoined', result);

    //         // Notify faculty about new student joined
    //         socket.to(roomName).emit('qr-studentJoined', {
    //             studentName: studentData.name,
    //             rollNumber: studentData.classRollNumber,
    //             totalJoined: result.sessionData?.studentsJoined?.length || 0
    //         });

    //     } catch (error) {
    //         console.error('QR Token refresh error:', error);
    //         socket.emit('qr-error', { message: error.message });
    //     }
    // });

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

    // ==================== MOBILE APP SOCKET HANDLERS ====================

    // Handle student joining session via socket (for mobile app)
    // socket.on('joinSession', async (data) => {
    //     try {
    //         if (socket.user.role !== 'student') {
    //             throw new Error('Only students can join sessions');
    //         }

    //         const { sessionId } = data;
    //         const studentData = {
    //             studentId: socket.user.studentId,
    //             name: socket.user.name,
    //             classRollNumber: socket.user.classRollNumber,
    //             email: socket.user.email,
    //             course: socket.user.course,
    //             semester: socket.user.semester,
    //             section: socket.user.section,
    //             fingerprint: data.fingerprint || 'socket-connection',
    //             webRTCIPs: data.webRTCIPs || [],
    //             userAgent: socket.handshake.headers['user-agent'],
    //             ipAddress: socket.handshake.headers['x-forwarded-for'] || socket.handshake.address
    //         };

    //         const result = await qrSessionService.joinSession(sessionId, studentData);

    //         // Send success response to student
    //         socket.emit('sessionJoined', {
    //             success: true,
    //             message: result.message,
    //             sessionData: result.sessionData
    //         });

    //         // Notify faculty about student joining (only if not already joined)
    //         if (result.sessionData && result.sessionData.facultyId) {
    //             const facultyRoom = `faculty-${result.sessionData.facultyId}`;
    //             socket.to(facultyRoom).emit('qr-studentJoined', {
    //                 studentName: studentData.name,
    //                 rollNumber: studentData.classRollNumber,
    //                 joinedAt: new Date(),
    //                 totalJoined: result.sessionData.studentsJoined
    //             });
    //         }

    //         console.log(`✅ Student joined session via socket: ${studentData.name} (${studentData.classRollNumber})`);

    //     } catch (error) {
    //         console.error('Join session error:', error);
    //         socket.emit('sessionJoinError', { message: error.message });
    //     }
    // });

    // Handle QR attendance marking via socket (replacing API)
    // socket.on('markAttendance', async (data) => {
    //     try {
    //         if (socket.user.role !== 'student') {
    //             throw new Error('Only students can mark attendance');
    //         }

    //         const studentData = {
    //             studentId: socket.user.studentId,
    //             name: socket.user.name,
    //             classRollNumber: socket.user.classRollNumber,
    //             email: socket.user.email,
    //             course: socket.user.course,
    //             semester: socket.user.semester,
    //             section: socket.user.section,
    //             fingerprint: data.fingerprint || 'socket-connection',
    //             webRTCIPs: data.webRTCIPs || [],
    //             userAgent: socket.handshake.headers['user-agent'],
    //             ipAddress: socket.handshake.headers['x-forwarded-for'] || socket.handshake.address,
    //             photoFilename: data.photoFilename,
    //             photoCloudinaryUrl: data.photoCloudinaryUrl
    //         };

    //         const result = await qrSessionService.markAttendance(data.qrToken, studentData);

    //         // Send success response to student
    //         socket.emit('attendanceMarked', {
    //             success: true,
    //             message: result.message,
    //             attendanceData: result.attendanceData,
    //             sessionStats: result.sessionStats
    //         });

    //         // Notify faculty and other students with standardized format
    //         const sectionRoom = `${studentData.course}-${studentData.semester}-${studentData.section}`;
            
    //         const attendanceUpdateData = {
    //             studentName: studentData.name,
    //             rollNumber: studentData.classRollNumber,
    //             markedAt: result.attendanceData.markedAt,
    //             totalPresent: result.sessionStats.studentsPresent, // This is already the count (length)
    //             totalJoined: result.sessionStats.studentsJoined,   // Add total joined count
    //             presentPercentage: result.sessionStats.presentPercentage,
    //             sessionId: result.attendanceData.sessionId,
    //             status: 'active',
    //             canJoin: false,
    //             canScanQR: true
    //         };
            
    //         // Emit to section room and broadcast to all connected clients
    //         console.log(`📊 Emitting attendance update to section room: ${sectionRoom}`);
    //         console.log(`📊 Attendance data:`, {
    //             studentName: attendanceUpdateData.studentName,
    //             rollNumber: attendanceUpdateData.rollNumber,
    //             totalPresent: attendanceUpdateData.totalPresent,
    //             totalJoined: attendanceUpdateData.totalJoined
    //         });
            
    //         socket.to(sectionRoom).emit('qr-attendanceUpdate', attendanceUpdateData);
    //         socket.broadcast.emit('qr-attendanceUpdate', attendanceUpdateData);

    //     } catch (error) {
    //         console.error('Mark attendance error:', error);
    //         socket.emit('attendanceError', { message: error.message });
    //     }
    // });

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