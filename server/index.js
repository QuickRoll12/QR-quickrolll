// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const attendanceService = require('./src/services/attendanceService');
// const cleanupService = require('./src/services/cleanupService');
// const { cleanupProcessedRequests } = require('./src/utils/cleanupTasks');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: '*' } });

// // Set up the callback for code regeneration
// attendanceService.setCodeRegenerationCallback((updatedSession) => {
    
//     // Broadcast the updated grid to all clients
//     io.emit('updateGrid', {
//         grid: updatedSession.grid,
//         department: updatedSession.department,
//         semester: updatedSession.semester,
//         section: updatedSession.section,
//         codeRefreshed: true,
//         timestamp: Date.now() // Add timestamp to force clients to recognize this as a new update
//     });
// });

// io.on('connection', (socket) => {
//     socket.emit('sessionStatus', attendanceService.getSessionStatus());

//     socket.on('getCourseData', () => {
//         try {
//             const courseData = attendanceService.getCourseData();
//             socket.emit('courseData', courseData);
//         } catch (error) {
//             socket.emit('error', {
//                 message: error.message || 'Failed to get course data',
//                 timestamp: Date.now()
//             });
//         }
//     });

//     socket.on('startSession', ({ department, semester, section, totalStudents }) => {
//         try {
//             console.log(`⚡ Starting new attendance session for ${department} - Semester ${semester} - Section ${section}`);
//             const { grid, sessionKey } = attendanceService.startSession(department, semester, section, totalStudents);
            
//             // Broadcast session status and grid to all clients
//             io.emit('sessionStatus', { 
//                 active: true,
//                 grid,
//                 totalStudents,
//                 department,
//                 semester,
//                 section,
//                 timestamp: Date.now()
//             });
            
//             io.emit('activeSessions', attendanceService.getAllActiveSessions());
//         } catch (error) {
//             socket.emit('error', {
//                 message: error.message || 'Failed to start session',
//                 timestamp: Date.now()
//             });
//         }
//     });

//     socket.on('endSession', ({ department, semester, section }) => {
//         try {
//             console.log(`🔚 Ending attendance session for ${department} - Semester ${semester} - Section ${section}`);
//             const result = attendanceService.endSession(department, semester, section);
            
//             if (result.success) {
//                 io.emit('sessionStatus', { 
//                     active: false,
//                     department,
//                     semester,
//                     section,
//                     timestamp: Date.now()
//                 });
                
//                 io.emit('absenteeList', {
//                     absentees: result.absentees,
//                     department,
//                     semester,
//                     section,
//                     timestamp: Date.now()
//                 });
//             } else {
//                 socket.emit('error', {
//                     message: result.message || 'Failed to end session',
//                     timestamp: Date.now()
//                 });
//             }
//         } catch (error) {
//             socket.emit('error', {
//                 message: error.message || 'Failed to end session',
//                 timestamp: Date.now()
//             });
//         }
//     });

//     socket.on('markAttendance', ({ department, semester, section, rollNumber, code, ipAddress }) => {
//         try {
//             console.log(`Marking attendance for ${rollNumber} in ${department}-${semester}-${section} with code ${code}`);
            
//             const result = attendanceService.markAttendance(
//                 department,
//                 semester,
//                 section,
//                 rollNumber,
//                 code,
//                 ipAddress || socket.handshake.address
//             );
            
//             socket.emit('attendanceResult', {
//                 ...result,
//                 timestamp: Date.now()
//             });
            
//             if (result.success) {
//                 io.emit('updateGrid', {
//                     grid: result.grid,
//                     department,
//                     semester,
//                     section,
//                     timestamp: Date.now()
//                 });
//             }
//         } catch (error) {
//             socket.emit('error', {
//                 message: error.message || 'Failed to mark attendance',
//                 timestamp: Date.now()
//             });
//         }
//     });

//     socket.on('refreshCodes', ({ department, semester, section }) => {
//         try {
//             console.log(`Manual code refresh requested for ${department}-${semester}-${section}`);
//             // Call the refreshCodes method directly with department, semester, section
//             const result = attendanceService.refreshCodes(department, semester, section);
            
//             if (result) {
//                 io.emit('updateGrid', {
//                     grid: result.grid,
//                     department,
//                     semester,
//                     section,
//                     timestamp: Date.now(),
//                     codeRefreshed: true
//                 });
                
//                 // Also emit a notification that codes have been refreshed for unmarked students
//                 io.emit('sessionStatus', { 
//                     active: true,
//                     grid: result.grid,
//                     totalStudents: result.totalStudents,
//                     department,
//                     semester,
//                     section,
//                     codesRefreshed: true,
//                     message: 'Attendance codes have been refreshed. Unmarked students can now use the new codes.',
//                     timestamp: Date.now()
//                 });
//             } else {
//                 socket.emit('error', {
//                     message: 'Failed to refresh codes. Please ensure the session is active.',
//                     timestamp: Date.now()
//                 });
//             }
//         } catch (error) {
//             socket.emit('error', {
//                 message: error.message || 'Failed to refresh codes',
//                 timestamp: Date.now()
//             });
//         }
//     });

//     socket.on('getSessionStatus', ({ department, semester, section }) => {
//         try {
//             const status = attendanceService.getSessionStatus(department, semester, section);
//             socket.emit('sessionStatus', {
//                 ...status,
//                 timestamp: Date.now()
//             });
//         } catch (error) {
//             socket.emit('error', {
//                 message: error.message || 'Failed to get session status',
//                 timestamp: Date.now()
//             });
//         }
//     });

//     socket.on('disconnect', () => {
//         console.log('User disconnected');
//     });
// });

// // Schedule cleanup task to run every hour
// setInterval(async () => {
//     try {
//         console.log('Running scheduled cleanup of processed faculty requests...');
//         const deletedCount = await cleanupProcessedRequests();
//         console.log(`Cleanup complete. Deleted ${deletedCount} expired faculty requests.`);
//     } catch (error) {
//         console.error('Error running scheduled cleanup:', error);
//     }
// }, 60 * 60 * 1000); // Run every hour

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
    
//     // Run cleanup tasks on server start
//     cleanupService.runCleanupTasks();
    
//     // Schedule cleanup tasks to run every 6 hours
//     const SIX_HOURS = 6 * 60 * 60 * 1000;
//     setInterval(() => {
//         console.log('Running scheduled cleanup tasks...');
//         cleanupService.runCleanupTasks();
//     }, SIX_HOURS);
// });

// // Export for testing
// module.exports = { app, server };