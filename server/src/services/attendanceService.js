const crypto = require('crypto');
const Proxy = require('../models/Proxy');
const WebRTCSession = require('../models/WebRTCSession');
const deviceTrackingService = require('./deviceTrackingService');
const DeviceSession = require('../models/DeviceSession');
const ProxyMarker = require('../models/ProxyMarker');
const axios = require('axios');
const reportService = require('./reportService');
const reportEmailService = require('./reportEmailService');
const User = require('../models/User');
const attendanceRecordService = require('./attendanceRecordService');
const photoVerificationService = require('./photoVerificationService');

class AttendanceService {
    constructor() {
        // Map to store multiple active sessions
        // Key: department_semester_section, Value: session data
        this.sessions = new Map();
        // Map to store timers for each session
        this.sessionTimers = new Map();
        // Map to store valid codes for each session
        this.validCodes = new Map();
        // Map to store IP addresses for each session
        // Key: sessionKey, Value: Set of IP addresses
        this.sessionIPs = new Map();
        // Map to store IP addresses that have marked attendance
        this.ipAddresses = new Map();
        // Callback for code regeneration
        this.codeRegenerationCallback = null;
        // List of departments
        this.departments = ['BTech', 'BCA', 'Law', 'MBA', 'BBA', 'BCom', 'BSc', 'MCA'];
        // List of semesters
        this.semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
        // List of sections
        this.sections = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2', 'K1', 'K2', 'L1', 'L2','ML1','ML2','ML3','DS1','DS2','A1 ML1','B1 C1','CS1 DS1 D1 D2','ML2 ML3','A2 E1 E2','C2 F1 F2 G1','Placement Group 1', 'Placement Group 2', 'Placement Group 3', 'Placement Group 4', 'Placement Group 5'];
        // Refresh interval for code regeneration
        this.refreshInterval = 5 * 60 * 1000; // 5 minutes
        // Length of the generated code
        this.codeLength = 4;
        // api chance 
        this.chance = 1;
        // Map to store auto-refresh timers for each session
        this.autoRefreshTimers = new Map();
        // Auto-refresh interval in milliseconds (8 seconds)
        this.autoRefreshInterval = 10 * 1000;
    }

    generateUniqueCode() {
        // Generate a shorter code (4 characters) for better visibility
        const code = crypto.randomBytes(2).toString('hex').toUpperCase();
        return code;
    }

    generateSessionKey(department, semester, section) {
        if (!department || !semester || !section) {
            throw new Error('Department, semester, and section are required');
        }
        return `${department}_${semester}_${section}`;
    }

    generateGrid() {
        // Create new grid with new codes
        const newGrid = Array(7).fill().map(() => 
            Array(13).fill().map(() => ({
                code: this.generateUniqueCode(),
                used: false,
                studentName: null,
                studentRoll: null,
                studentEmail: null,
                photo_url: null,
                photoFilename: null,
                cloudinaryUrl: null
            }))
        );
        return newGrid;
    }

    validateFields(department, semester, section) {
        if (!department || !semester || !section) {
            throw new Error('Department, semester, and section are required');
        }

        if (!this.departments.includes(department)) {
            throw new Error('Invalid department');
        }

        if (!this.semesters.includes(semester)) {
            throw new Error('Invalid semester');
        }

        if (!this.sections.includes(section)) {
            throw new Error('Invalid section');
        }
    }

    async startSession(department, semester, section, totalStudents, sessionType = 'roll') {
        this.validateFields(department, semester, section);

        // For roll-based sessions, totalStudents is required
        if (sessionType !== 'gmail' && (!totalStudents || isNaN(totalStudents) || totalStudents < 1)) {
            throw new Error('Total students must be a positive number');
        }

        const sessionKey = this.generateSessionKey(department, semester, section);
        
        if (this.sessions.has(sessionKey)) {
            throw new Error('Session already exists');
        }

        const grid = this.generateGrid();

        // Initialize empty IP set for this session
        this.sessionIPs.set(sessionKey, new Set());
        
        this.sessions.set(sessionKey, {
            active: true,
            grid,
            totalStudents: parseInt(totalStudents || 0),
            presentStudents: new Set(),
            department,
            semester,
            section,
            sessionType: sessionType || 'roll' // 'roll' or 'gmail'
        });

        // Start auto-refresh timer for this session
        this.startAutoRefresh(sessionKey);

        return {
            success: true,
            message: 'Session started successfully',
            grid,
            totalStudents: parseInt(totalStudents || 0),
            sessionType: sessionType || 'roll'
        };
    }

    getSessionStatus(department, semester, section) {
        this.validateFields(department, semester, section);
        
        const sessionKey = this.generateSessionKey(department, semester, section);
        const sessionData = this.sessions.get(sessionKey);

        if (!sessionData) {
            return {
                active: false,
                grid: this.generateGrid(),
                totalStudents: 0,
                sessionType: 'roll'
            };
        }

        return {
            active: sessionData.active,
            grid: sessionData.grid,
            totalStudents: sessionData.totalStudents,
            department: sessionData.department,
            semester: sessionData.semester,
            section: sessionData.section,
            sessionType: sessionData.sessionType || 'roll'
        };
    }

    async markAttendance(department, semester, section, rollNumber, code, fingerprint, webRTCIPs, userId, req, gmail = null, photoFilename = null, photoCloudinaryUrl = null) {
        const startTime = Date.now();
        console.log(`[${new Date().toISOString()}] - Attendance marking started`);
    
        this.validateFields(department, semester, section);
    
        // Device check
        const { ip, userName, userAgent } = req;
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
        if (!isMobile) throw new Error('User is not allowed to mark attendance from PC or Laptop !!!');
    
        // Check if this is a Gmail-based session
        const sessionKey = this.generateSessionKey(department, semester, section);
        const sessionData = this.sessions.get(sessionKey);
    
        if (!sessionData?.active) throw new Error('No active session found');
        
        const isGmailSession = sessionData.sessionType === 'gmail';
        
        // Validate inputs based on session type
        if (isGmailSession) {
            if (!code || !fingerprint) {
                throw new Error('Invalid input: Code and device fingerprint are required');
            }
            // We trust that the email is available from the user's profile
            // No need to explicitly validate it here
        } else {
            if (!rollNumber || !code || !fingerprint || !/^\d{2}$/.test(rollNumber)) {
                throw new Error('Invalid input: Roll number must be 2 digits, and all fields are required');
            }
        }

        // Check if user is marked as suspicious in ProxyMarker collection
        const proxyMarkerCheck = await ProxyMarker.findOne({ userId });
        if (proxyMarkerCheck) {
            throw new Error('VPN detected !! Your attendance has been restricted.');
        }
    
        // We already fetched and validated the session above
        
        // For roll-based sessions, validate roll number
        if (!isGmailSession) {
            if (parseInt(rollNumber) > sessionData.totalStudents) throw new Error('Roll number exceeds total students.');
            if (sessionData.presentStudents.has(rollNumber)) throw new Error('Attendance already marked');
        } else {
            // For Gmail-based sessions, check if attendance already marked
            // We trust that the email is already validated on the client side and in app.js
            if (sessionData.presentStudents.has(gmail)) throw new Error('Attendance already marked for this email');
        }
    
        // Validating attendance code efficiently
        let codeFound = false;
        let row = -1,col=-1;
        for(let i=0; i<sessionData.grid.length; i++) {
            for(let j=0; j<sessionData.grid[i].length; j++) {
                if(sessionData.grid[i][j].code === code && !sessionData.grid[i][j].used) {
                    sessionData.grid[i][j].used = true;
                    row = i;
                    col = j;
                    codeFound = true;
                    break;
                }
            }
            if (codeFound) break;
        }
        if (!codeFound) throw new Error('Invalid or already used code');
    
        // Fetching Proxy & WebRTC data in parallel
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const [userAttendanceCheck, existingWebRTCSessions, recentProxy] = await Promise.all([
            Proxy.findOne({ userId, department, semester, section, timestamp: { $gte: fifteenMinutesAgo } }),
            WebRTCSession.find({ webRTCIPs: { $in: webRTCIPs }, timestamp: { $gte: fifteenMinutesAgo }, userId: { $ne: userId } }),
            Proxy.findOne({ fingerprint, timestamp: { $gte: fifteenMinutesAgo } })
        ]);
    
        if (userAttendanceCheck){
            sessionData.grid[row][col].used = false;
            throw new Error('This device has already marked the attendance in last 15 minutes.');
        } 
        // if (existingWebRTCSessions.length > 0) {
        //     sessionData.grid[row][col].used = false;
        //     throw new Error('Multiple attendance attempts detected!');
        // }
        if (recentProxy) {
            sessionData.grid[row][col].used = false;
            throw new Error(`Device on cooldown. Please wait before retrying.`);
        }
    
        // checking for VPN
        try {
            let countryName;
            
            if (this.chance === 1) {
                // country.is API
                const response = await axios.get(`https://api.country.is/${ip.split(',')[0].trim()}`);
                countryName = response.data?.country?.toLowerCase();
            } 
            else if (this.chance === 2) {
                // ipapi.co API
                const response = await axios.get(`https://ipapi.co/${ip.split(',')[0].trim()}/country_name`);
                countryName = response.data.toLowerCase();
            } 
            else {
                // ipbase API (original one)
                const response = await axios.get(`https://api.ipbase.com/v1/json/${ip.split(',')[0].trim()}`);
                countryName = response.data?.country_name?.toLowerCase();
            }
    
            // Rotate the chance variable (1 → 2 → 3 → 1)
            this.chance = this.chance === 3 ? 1 : this.chance + 1;
    
            if (countryName !== "india" && countryName !== "in") {
                await ProxyMarker.create({ userId, name: req.userName, course: department, section, classRollNumber: rollNumber, ipAddress: ip, country: countryName });
                sessionData.grid[row][col].used = false;
                throw new Error('VPN use detected! You have been flagged for suspicious activity.');
            }
        } catch (error) {
            if (error.message.includes('VPN')) throw error;
        }
    
        // Validating device tracking
        const deviceCheckResult = await deviceTrackingService.canMarkAttendance({ fingerprint, webRTCIPs, ipAddress: ip }, { userId, userName: req.userName || 'Unknown', userRoll: rollNumber }, { department, semester, section });
    
        if (!deviceCheckResult.allowed) {
            sessionData.grid[row][col].used = false;
            throw new Error(deviceCheckResult.reason);
        }
    
        const sessionIPs = this.sessionIPs.get(sessionKey) || new Set();
        if (sessionIPs.has(ip)) {
            sessionData.grid[row][col].used = false;
            throw new Error('Attendance already marked from this device.');
        }
    
        // Determine the identifier to store (rollNumber or gmail)
        const identifier = sessionData.sessionType === 'gmail' ? gmail : rollNumber;
        
        // Fetch user data to get the photo_url and other student information
        const user = await User.findById(userId);
        if (!user) {
            sessionData.grid[row][col].used = false;
            throw new Error('User not found');
        }
        
        // Store student information in the grid cell
        sessionData.grid[row][col].studentName = user.name;
        sessionData.grid[row][col].studentRoll = user.classRollNumber;
        sessionData.grid[row][col].studentEmail = user.email;
        sessionData.grid[row][col].photo_url = user.photo_url || '/default-student.png';
        
        // we can use this code in future if we would setup the backend for photo verification
        // if (photoFilename) {
        //     const verificationResult = await photoVerificationService.verifyPhoto(photoFilename, user.photo_url);
        //     if (!verificationResult.verified) {
        //         sessionData.grid[row][col].used = false;
        //         throw new Error('Photo verification failed');
        //     }
        //     // Add the photoFilename to the grid cell
        sessionData.grid[row][col].photoFilename = photoFilename;
        //     // Add the Cloudinary URL if available
        if (photoCloudinaryUrl) {
            sessionData.grid[row][col].cloudinaryUrl = photoCloudinaryUrl;
        }
        // }

        // Storing WebRTC Session & Attendance
        await WebRTCSession.create({ userId, webRTCIPs, timestamp: new Date() });
        await Proxy.create({ 
            fingerprint, 
            ipAddress: ip, 
            webRTCIPs, 
            userId, 
            department, 
            semester, 
            section, 
            rollNumber: sessionData.sessionType === 'gmail' ? null : rollNumber,
            email: sessionData.sessionType === 'gmail' ? gmail : null,
            timestamp: new Date(), 
            deviceInfo: `Browser: ${fingerprint.substring(0, 20)}..., IP: ${ip}` 
        });
        this.sessionIPs.set(sessionKey, sessionIPs.add(ip));
    
        sessionData.presentStudents.add(identifier);
        this.sessions.set(sessionKey, sessionData);
    
        const totalTime = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] - Total execution time: ${totalTime}ms`);
    
        return { success: true, message: 'Attendance marked successfully', grid: sessionData.grid };
    }

    // Handle full-screen violation for a student
    async handleFullScreenViolation(department, semester, section, rollNumber, fingerprint, webRTCIPs, userId, req, gmail = null) {
        try {
            console.log(`[${new Date().toISOString()}] - Full-screen violation detected`);
            
            this.validateFields(department, semester, section);
            
            const sessionKey = this.generateSessionKey(department, semester, section);
            const sessionData = this.sessions.get(sessionKey);
            
            if (!sessionData?.active) {
                throw new Error('No active session found');
            }
            
            const isGmailSession = sessionData.sessionType === 'gmail';
            
            // For roll-based sessions
            if (!isGmailSession) {
                if (!rollNumber || !/^\d{2}$/.test(rollNumber)) {
                    throw new Error('Invalid roll number format');
                }
                
                // Check if the student is present
                if (sessionData.presentStudents.has(rollNumber)) {
                    console.log(`[${new Date().toISOString()}] - Removing student with roll ${rollNumber} from present list due to full-screen violation`);
                    
                    // Remove from present list
                    sessionData.presentStudents.delete(rollNumber);
                    
                    // Find the cell in the grid that was used by this student and mark it as unused
                    for (let i = 0; i < sessionData.grid.length; i++) {
                        for (let j = 0; j < sessionData.grid[i].length; j++) {
                            const cell = sessionData.grid[i][j];
                            if (cell.studentRoll === rollNumber) {
                                // Mark cell as unused
                                sessionData.grid[i][j].used = false;
                                sessionData.grid[i][j].studentRoll = null;
                                sessionData.grid[i][j].studentName = null;
                                sessionData.grid[i][j].photo_url = null;
                                break;
                            }
                        }
                    }
                    
                    // Log the violation
                    console.log(`Student with roll ${rollNumber} marked absent due to full-screen violation`);
                    
                    return {
                        success: true,
                        message: `Student with roll ${rollNumber} marked absent due to full-screen violation`
                    };
                } else {
                    return {
                        success: false,
                        message: 'Student not found in present list'
                    };
                }
            } 
            // For Gmail-based sessions
            else {
                if (!gmail) {
                    throw new Error('Email is required for Gmail-based sessions');
                }
                
                // Check if the student is present by finding their cell in the grid
                let studentFound = false;
                
                for (let i = 0; i < sessionData.grid.length; i++) {
                    for (let j = 0; j < sessionData.grid[i].length; j++) {
                        const cell = sessionData.grid[i][j];
                        if (cell.studentEmail === gmail) {
                            // Mark cell as unused
                            sessionData.grid[i][j].used = false;
                            sessionData.grid[i][j].studentEmail = null;
                            sessionData.grid[i][j].studentName = null;
                            sessionData.grid[i][j].photo_url = null;
                            studentFound = true;
                            break;
                        }
                    }
                    if (studentFound) break;
                }
                
                if (studentFound) {
                    // Log the violation
                    console.log(`Student with email ${gmail} marked absent due to full-screen violation`);
                    
                    return {
                        success: true,
                        message: `Student with email ${gmail} marked absent due to full-screen violation`
                    };
                } else {
                    return {
                        success: false,
                        message: 'Student not found in present list'
                    };
                }
            }
        } catch (error) {
            console.error('Error handling full-screen violation:', error);
            return {
                success: false,
                message: error.message || 'Failed to handle full-screen violation'
            };
        }
    }

    refreshCodes(department, semester, section) {
        this.validateFields(department, semester, section);
        
        const sessionKey = this.generateSessionKey(department, semester, section);
        const sessionData = this.sessions.get(sessionKey);
        
        if (!sessionData) {
            throw new Error('No session found');
        }
        
        if (!sessionData.active) {
            throw new Error('Session is not active');
        }
        
        // Generate new codes for unused cells
        for (let i = 0; i < sessionData.grid.length; i++) {
            for (let j = 0; j < sessionData.grid[i].length; j++) {
                // Only refresh codes for cells that haven't been used yet
                if (!sessionData.grid[i][j].used) {
                    sessionData.grid[i][j].code = this.generateUniqueCode();
                }
            }
        }
        
        return {
            success: true,
            message: 'Codes refreshed successfully',
            grid: sessionData.grid
        };
    }
    
    /**
     * Starts the auto-refresh timer for a session
     * @param {string} sessionKey - Session key
     */
    startAutoRefresh(sessionKey) {
        // Clear any existing timer
        this.stopAutoRefresh(sessionKey);
        
        // Get session data
        const sessionData = this.sessions.get(sessionKey);
        if (!sessionData) return;
        
        // Create a new timer
        const timer = setInterval(() => {
            try {
                // Extract department, semester, section from sessionKey
                const [department, semester, section] = sessionKey.split('_');
                
                // Refresh the codes
                const result = this.refreshCodes(department, semester, section);
                
                // If there's a callback registered, call it with the result
                if (this.codeRegenerationCallback) {
                    this.codeRegenerationCallback({
                        grid: result.grid,
                        department,
                        semester,
                        section
                    });
                }
            } catch (error) {
                console.error(`Error in auto-refresh for session ${sessionKey}:`, error.message);
            }
        }, this.autoRefreshInterval);
        
        // Store the timer
        this.autoRefreshTimers.set(sessionKey, timer);
    }
    
    /**
     * Stops the auto-refresh timer for a session
     * @param {string} sessionKey - Session key
     */
    stopAutoRefresh(sessionKey) {
        const timer = this.autoRefreshTimers.get(sessionKey);
        if (timer) {
            clearInterval(timer);
            this.autoRefreshTimers.delete(sessionKey);
        }
    }
    
    /**
     * Sets the callback function for code regeneration
     * @param {Function} callback - Callback function
     */
    setCodeRegenerationCallback(callback) {
        this.codeRegenerationCallback = callback;
    }

    async endSession(department, semester, section, facultyUser = null) {
        this.validateFields(department, semester, section);
        
        const sessionKey = this.generateSessionKey(department, semester, section);
        const sessionData = this.sessions.get(sessionKey);
        
        if (!sessionData) {
            throw new Error('No session found');
        }
        
        if (!sessionData.active) {
            throw new Error('Session is not active');
        }
        
        // Stop the auto-refresh timer for this session
        this.stopAutoRefresh(sessionKey);
        
        // Rest of the endSession method...
        
        // Clear session timer if it exists
        if (this.sessionTimers.has(sessionKey)) {
            clearInterval(this.sessionTimers.get(sessionKey));
            this.sessionTimers.delete(sessionKey);
        }

        // Clear valid codes for this session
        this.validCodes.delete(sessionKey);

        // Clear IP addresses that have marked attendance
        this.ipAddresses.delete(sessionKey);

        let allEmails = [];
        if (sessionData.sessionType === 'gmail') {
            try {
                const User = require('../models/User');
                const users = await User.find({ 
                    course: department, 
                    section: section,
                    role: 'student'
                }).select('email');
                
                allEmails = users.map(user => user.email);
            } catch (error) {
                console.error('Error fetching emails for Gmail-based session:', error);
                // Continue with the emails we have
            }
        }

        // Prepare session data for report generation
        const reportSessionData = {
            department,
            semester,
            section,
            totalStudents: sessionData.totalStudents,
            presentStudents: Array.from(sessionData.presentStudents),
            absentees: [],
            date: new Date(),
            sessionType: sessionData.sessionType || 'roll'
        };

        // Calculate absentees for roll-based sessions
        if (sessionData.sessionType === 'roll') {
            for (let i = 1; i <= sessionData.totalStudents; i++) {
                const rollNumber = i < 10 ? `0${i}` : `${i}`;
                if (!sessionData.presentStudents.has(rollNumber)) {
                    reportSessionData.absentees.push(rollNumber);
                }
            }
        }

        // Clear session data
        this.sessions.delete(sessionKey);
        // Clear IP addresses for this session
        this.sessionIPs.delete(sessionKey);

        // Save session end time in Indian format (IST)
        const currentTime = new Date();
        // Add 5 hours and 30 minutes to convert to IST
        const istTime = new Date(currentTime.getTime() + (5 * 60 + 30) * 60 * 1000);
        const sessionEndTime = istTime.toLocaleTimeString('en-IN', {
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true // Use 12-hour format with AM/PM
        });
        // Format date in Indian format (DD-MM-YYYY)
        const sessionEndDate = istTime.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        try {
            // Get faculty information
            let facultyData = {
                name: 'Faculty',
                email: process.env.EMAIL_USER || 'faculty@example.com',
                facultyId: 'unknown'
            };

            // Use the faculty user information if provided
            if (facultyUser) {
                facultyData = {
                    name: facultyUser.name,
                    email: facultyUser.email,
                    facultyId: facultyUser.facultyId || facultyUser._id
                };
            } else {
                // If no faculty user provided, try to get faculty information from the database
                try {
                    // Find the faculty for this department and section using the teaching assignments
                    const faculty = await User.findOne({
                        role: 'faculty',
                        teachingAssignments: { 
                            $elemMatch: { 
                                semester: semester,
                                section: section 
                            }
                        }
                    });

                    if (faculty) {
                        facultyData = {
                            name: faculty.name,
                            email: faculty.email,
                            facultyId: faculty.facultyId || faculty._id
                        };
                    }
                } catch (error) {
                    console.error('Error fetching faculty information:', error);
                    // Continue with default faculty data
                }
            }

            // Save attendance record to database
            const attendanceRecord = await attendanceRecordService.saveAttendanceRecord(
                reportSessionData,
                facultyData
            );

            // Generate PDF report
            // const reportFilePath = await reportService.generateAttendanceReport(reportSessionData, facultyData);
            
            // Send email with the report
            // const emailResult = await reportEmailService.sendAttendanceReport({
            //     to: facultyData.email,
            //     subject: `Attendance Report - ${department} ${semester} ${section}`,
            //     department,
            //     semester,
            //     section,
            //     totalStudents: reportSessionData.totalStudents,
            //     presentCount: reportSessionData.presentStudents.length,
            //     absentCount: reportSessionData.absentees.length,
            //     date: new Date().toLocaleDateString(),
            //     attachmentPath: reportFilePath
            // });

            // Clean up the temporary file after sending
            // reportService.cleanupTempFile(reportFilePath);
            
            // console.log('Report generation result:', emailResult.success ? 'Success' : 'Failed');
            console.log('Attendance record saved with ID:', attendanceRecord._id);
            
            // Send absence notification emails to absent students
            if (sessionData.sessionType === 'roll' && reportSessionData.absentees.length > 0) {
                try {
                    console.log(`Sending absence notifications to ${reportSessionData.absentees.length} students...`);
                    this.sendAbsenceNotifications(department, section, reportSessionData.absentees, {
                        facultyName: facultyData.name,
                        sessionTime: sessionEndTime,
                        department,
                        semester,
                        section,
                        date: sessionEndDate,
                        istDateTime: istTime // Pass full datetime object in case needed
                    });
                } catch (error) {
                    console.error('Error initiating absence notifications:', error);
                }
            }
        } catch (error) {
            console.error('Error generating or sending attendance report:', error);
            // Don't throw error here, as we still want to end the session
        }

        console.log(`Ended session for ${department} - Semester ${semester} - Section ${section}`);
        console.log(`Session Type: ${sessionData.sessionType}, Total Students: ${sessionData.totalStudents}, Present: ${sessionData.presentStudents.size}, Absent: ${sessionData.sessionType === 'roll' ? reportSessionData.absentees.length : 'N/A (Gmail session)'}`);

        return {
            success: true,
            message: 'Session ended successfully',
            department,
            semester,
            section,
            totalStudents: sessionData.totalStudents,
            presentCount: sessionData.presentStudents.size,
            absentees: reportSessionData.absentees,
            presentStudents: Array.from(sessionData.presentStudents),
            sessionType: sessionData.sessionType,
            allEmails: sessionData.sessionType === 'gmail' ? allEmails : []
        };
    }

    /**
     * Send absence notifications to students who were absent in the session
     * Uses a queue approach to avoid overwhelming the email server
     * @param {string} department - Department name
     * @param {string} section - Section name
     * @param {string[]} absentRollNumbers - Array of roll numbers of absent students
     * @param {Object} sessionInfo - Information about the session
     */
    async sendAbsenceNotifications(department, section, absentRollNumbers, sessionInfo) {
        try {
            if (!absentRollNumbers || absentRollNumbers.length === 0) {
                console.log('No absent students to notify');
                return;
            }

            console.log(`Starting absence notifications for ${absentRollNumbers.length} roll numbers:`, absentRollNumbers);
            
            // Get the database object and use it to fetch student information
            const User = require('../models/User');
            
            // Debug: Log the query we're about to make
            console.log(`Querying students with role='student', course='${department}', section='${section}'`);
            
            // First, get all students in the section to debug roll number format
            const allStudents = await User.find({
                role: 'student',
                course: department,
                section: section
            }).select('email name classRollNumber');
            
            console.log(`Found ${allStudents.length} total students in section ${section}`);
            
            // Try different approaches to match roll numbers
            let absentStudents = [];
            
            // Approach 1: Direct match with the correct field name (classRollNumber)
            absentStudents = await User.find({
                role: 'student',
                course: department,
                section: section,
                classRollNumber: { $in: absentRollNumbers }
            }).select('email name classRollNumber');
            
            console.log(`Direct match found ${absentStudents.length} absent students`);
            
            // Approach 2: If no matches, try with numeric roll numbers
            if (absentStudents.length === 0) {
                const numericRollNumbers = absentRollNumbers.map(roll => parseInt(roll));
                absentStudents = await User.find({
                    role: 'student',
                    course: department,
                    section: section,
                    classRollNumber: { $in: numericRollNumbers.map(String) }
                }).select('email name classRollNumber');
                
                console.log(`Numeric match found ${absentStudents.length} absent students`);
            }
            
            // Approach 3: Try with roll numbers that might be stored without leading zeros
            if (absentStudents.length === 0) {
                const strippedRollNumbers = absentRollNumbers.map(roll => roll.replace(/^0+/, ''));
                absentStudents = await User.find({
                    role: 'student',
                    course: department,
                    section: section,
                    classRollNumber: { $in: strippedRollNumbers }
                }).select('email name classRollNumber');
                
                console.log(`Stripped-zero match found ${absentStudents.length} absent students`);
            }
            
            // Approach 4: Try case-insensitive regex match
            if (absentStudents.length === 0) {
                // Create an array of OR conditions for each roll number
                const orConditions = absentRollNumbers.map(roll => ({
                    classRollNumber: new RegExp(`^${roll}$`, 'i')
                }));
                
                absentStudents = await User.find({
                    role: 'student',
                    course: department,
                    section: section,
                    $or: orConditions
                }).select('email name classRollNumber');
                
                console.log(`Regex match found ${absentStudents.length} absent students`);
            }
            
            // If we still have no matches, try a more desperate approach with the all students list
            if (absentStudents.length === 0 && allStudents.length > 0) {
                console.log('Falling back to manual matching against all students in section');
                
                // Create a set of roll numbers for faster lookups
                const absentRollSet = new Set(absentRollNumbers);
                const absentRollNumeric = new Set(absentRollNumbers.map(r => parseInt(r)));
                const absentRollStripped = new Set(absentRollNumbers.map(r => r.replace(/^0+/, '')));
                
                // Filter all students to find those with matching roll numbers
                absentStudents = allStudents.filter(student => {
                    const roll = student.classRollNumber;
                    const rollStr = roll?.toString() || '';
                    
                    return absentRollSet.has(roll) || 
                           absentRollSet.has(rollStr) ||
                           absentRollNumeric.has(parseInt(roll)) ||
                           absentRollStripped.has(rollStr.replace(/^0+/, ''));
                });
                
                console.log(`Manual match found ${absentStudents.length} absent students`);
            }
            
            if (!absentStudents || absentStudents.length === 0) {
                console.log('No student records found for absent roll numbers after all matching attempts');
                return;
            }
            
            console.log(`Found ${absentStudents.length} student records for absence notifications`);
            console.log('Students to be notified:', absentStudents.map(s => `${s.name} (${s.classRollNumber}): ${s.email}`));
            
            // Process emails in small batches with delays to manage server load
            const batchSize = 5; // Send 5 emails at a time
            const delayBetweenBatches = 5000; // 5 seconds between batches
            
            // Get email service
            const reportEmailService = require('./reportEmailService');
            
            // Process emails in batches
            for (let i = 0; i < absentStudents.length; i += batchSize) {
                const batch = absentStudents.slice(i, i + batchSize);
                
                console.log(`Processing absence notification batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(absentStudents.length/batchSize)}`);
                
                // Process each email in the batch
                const emailPromises = batch.map(student => {
                    if (!student.email) {
                        console.log(`No email address for student: ${student.name} (${student.classRollNumber})`);
                        return Promise.resolve({ success: false, message: 'No email address' });
                    }
                    
                    return reportEmailService.sendEmail({
                        to: student.email,
                        subject: `Absence Notification - ${sessionInfo.department} ${sessionInfo.section}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                                <h2 style="color: #d32f2f;">Absence Notification</h2>
                                
                                <p>Dear ${student.name},</p>
                                
                                <p>This is to inform you that you were marked absent in a class at <strong>${sessionInfo.sessionTime}</strong> today.</p>
                                
                                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                                    <p style="margin: 5px 0;"><strong>Class Details:</strong></p>
                                    <ul style="margin: 10px 0; padding-left: 20px;">
                                        <li>Faculty: ${sessionInfo.facultyName}</li>
                                        <li>Department: ${sessionInfo.department}</li>
                                        <li>Section: ${sessionInfo.section}</li>
                                        <li>Semester: ${sessionInfo.semester}</li>
                                        <li>Date: ${sessionInfo.date}</li>
                                        <li>Time: ${sessionInfo.sessionTime}</li>
                                    </ul>
                                </div>
                                
                                <p>If you believe this is an error, please contact your faculty member as soon as possible.</p>
                                
                                <p style="margin-top: 20px;">Regards,<br>QuickRoll Attendance System</p>
                                
                                <div style="color: #777; font-size: 12px; margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">
                                    <p>This is an automated notification. Please do not reply to this email.</p>
                                </div>
                            </div>
                        `
                    });
                });
                
                try {
                    // Wait for all emails in this batch to be sent
                    const results = await Promise.allSettled(emailPromises);
                    
                    // Log results
                    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
                    const failed = results.length - successful;
                    
                    console.log(`Batch ${Math.floor(i/batchSize) + 1} results: ${successful} sent, ${failed} failed`);
                    
                    // If there are more batches, wait before processing the next batch
                    if (i + batchSize < absentStudents.length) {
                        console.log(`Waiting ${delayBetweenBatches/1000} seconds before processing next batch...`);
                        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
                    }
                } catch (error) {
                    console.error('Error sending batch of absence notifications:', error);
                    // Continue with next batch even if there's an error
                }
            }
            
            console.log(`Finished sending absence notifications to ${absentStudents.length} students`);
            
        } catch (error) {
            console.error('Error in sendAbsenceNotifications:', error);
        }
    }

    getAllActiveSessions() {
        const activeSessions = [];
        this.sessions.forEach((sessionData, sessionKey) => {
            const [department, semester, section] = sessionKey.split('_');
            activeSessions.push({
                department,
                semester,
                section,
                totalStudents: sessionData.totalStudents,
                presentCount: sessionData.presentStudents.size,
                sessionType: sessionData.sessionType || 'roll'
            });
        });
        return activeSessions;
    }

    getCourseData() {
        return {
            departments: [...this.departments],  // Send a copy to prevent modification
            semesters: [...this.semesters],
            sections: [...this.sections]
        };
    }
}

module.exports = new AttendanceService();
