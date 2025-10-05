import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import io from "socket.io-client";
import QRAttendancePanel from '../components/QRAttendancePanel';
import '../styles/notifications.css';
import '../styles/GridHoverCard.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const FacultyDashboard = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    
    const [socket, setSocket] = useState(null);
    const initialGrid = Array(7).fill().map(() => Array(13).fill({ code: '', used: false }));
    const [grid, setGrid] = useState(initialGrid);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [totalStudents, setTotalStudents] = useState('');
    const [showNotification, setShowNotification] = useState(false);
    const [notificationType, setNotificationType] = useState('success'); // 'success' or 'error'
    const [notificationMessage, setNotificationMessage] = useState('');
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionTimer, setSessionTimer] = useState(0);
    const [timerInterval, setTimerInterval] = useState(null);
    const [departments] = useState(['BTech', 'BCA', 'BCom', 'BBA', 'Law', 'MCA', 'MBA', 'BPharm','BSc','']);
    const [semesters] = useState(['1', '2', '3', '4', '5', '6', '7', '8']);
    const [availableSections, setAvailableSections] = useState([]);
    const [availableTeachingAssignments, setAvailableTeachingAssignments] = useState([]);
    const [availableSemesterSections, setAvailableSemesterSections] = useState({});
    const [sessionStats, setSessionStats] = useState(null);
    const [copiedText, setCopiedText] = useState('');
    const [attendanceType, setAttendanceType] = useState('roll'); // 'roll' or 'gmail'
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [startingSession, setStartingSession] = useState(false);
    const [endingSession, setEndingSession] = useState(false);
    
    // QR Attendance State
    const [qrSessionData, setQrSessionData] = useState(null);
    const [qrData, setQrData] = useState(null);
    const [qrSessionActive, setQrSessionActive] = useState(false);

    useEffect(() => {
        if (user?.role === 'faculty') {
            const token = localStorage.getItem('token');
            const newSocket = io(BACKEND_URL, {
                auth: {
                    token
                }
            });
            setSocket(newSocket);

            // Handle socket connection error
            newSocket.on('connect_error', (error) => {
                console.error('Socket connection error:', error.message);
                showErrorMessage('Connection error: ' + error.message);
            });

            // Handle socket error
            newSocket.on('error', (error) => {
                console.error('Socket error:', error.message);
                showErrorMessage(error.message);
            });

            // QR Attendance Socket Listeners
            newSocket.on('qr-sessionStarted', (data) => {
                console.log('QR Session started:', data);
                setQrSessionData(data.sessionData);
                setQrSessionActive(true);
                showSuccessMessage('QR Session started successfully!');
            });

            newSocket.on('qr-sessionLocked', (data) => {
                console.log('QR Session locked:', data);
                setQrSessionData(data.sessionData);
                showSuccessMessage('Session locked successfully!');
            });

            newSocket.on('qr-sessionUnlocked', (data) => {
                console.log('QR Session unlocked:', data);
                setQrSessionData(data.sessionData);
                showSuccessMessage('Session unlocked successfully!');
            });

            newSocket.on('qr-attendanceStarted', (data) => {
                console.log('QR Attendance started:', data);
                setQrSessionData(data.sessionData);
                setQrData(data.qrData);
                showSuccessMessage('QR Attendance started!');
            });

            newSocket.on('qr-tokenRefreshed', (newQRData) => {
                console.log('QR Token refreshed:', newQRData);
                setQrData(newQRData);
            });

            newSocket.on('qr-sessionEnded', (data) => {
                console.log('QR Session ended:', data);
                setQrSessionData(null);
                setQrData(null);
                setQrSessionActive(false);
                showSuccessMessage('Session ended successfully!');
            });

            newSocket.on('qr-error', (error) => {
                console.error('QR Error:', error);
                showErrorMessage(error.message);
            });

            newSocket.on('qr-joinSessionBroadcasted', (data) => {
                console.log('Join session broadcasted:', data);
                showSuccessMessage('Join session notification sent to all students!');
            });

            return () => newSocket.close();
        }
    }, [user]);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'faculty')) {
            navigate('/');
        } else if (user && user.role === 'faculty') {
            // Handle teaching assignments structure
            if (user.teachingAssignments && Array.isArray(user.teachingAssignments) && user.teachingAssignments.length > 0) {
                setAvailableTeachingAssignments(user.teachingAssignments);
                
                // Create a mapping of semester to available sections
                const semesterSections = {};
                user.teachingAssignments.forEach(assignment => {
                    if (!semesterSections[assignment.semester]) {
                        semesterSections[assignment.semester] = [];
                    }
                    semesterSections[assignment.semester].push(assignment.section);
                });
                setAvailableSemesterSections(semesterSections);
                
                // Extract unique sections from teaching assignments
                const uniqueSections = [...new Set(user.teachingAssignments.map(a => a.section))];
                setAvailableSections(uniqueSections);
            }
        }
    }, [user, loading, navigate]);

    // useEffect(() => {
    //     if (!socket) return;

    //     const handleSessionStatus = (status) => {
    //         console.log('Received session status:', status);
    //         if (status && status.department === selectedDepartment && 
    //             status.semester === selectedSemester && 
    //             status.section === selectedSection) {
    //             setSessionActive(status.active);
    //             // Reset loading states when we get a response
    //             setStartingSession(false);
    //             setEndingSession(false);
                
    //             if (status.grid) {
    //                 setGrid(status.grid);
    //             }
    //             if (status.totalStudents) {
    //                 setTotalStudents(status.totalStudents.toString());
    //             }
    //             if (status.sessionType) {
    //                 setAttendanceType(status.sessionType);
    //             }
    //         }
    //     };

    //     const handleUpdateGrid = (updatedData) => {
    //         console.log('Received grid update:', updatedData);
    //         if (updatedData && updatedData.grid && 
    //             updatedData.department === selectedDepartment && 
    //             updatedData.semester === selectedSemester && 
    //             updatedData.section === selectedSection) {
    //             setGrid(updatedData.grid);
    //         }
    //     };

    //     const handleSessionEnded = (data) => {
    //         console.log('Session ended:', data);
    //         if (data.success && 
    //             data.department === selectedDepartment && 
    //             data.semester === selectedSemester && 
    //             data.section === selectedSection) {
    //             setSessionActive(false);
    //             setSessionStats({
    //                 totalStudents: data.totalStudents,
    //                 presentCount: data.presentCount,
    //                 absentees: data.absentees,
    //                 presentStudents: data.presentStudents,
    //                 sessionType: data.sessionType
    //             });
                
    //             // Clear session stats after 1 minute
    //             setTimeout(() => {
    //                 setSessionStats(null);
    //             }, 60000); // Clear stats after 1 minute
    //         }
    //     };

    //     const handleSuccess = (data) => {
    //         console.log('Success:', data);
    //         showSuccessMessage(data.message);
    //         setTimeout(() => setShowNotification(false), 3000);
    //     };

    //     const handleError = (data) => {
    //         console.error('Error:', data);
    //         showErrorMessage(data.message);
    //         setTimeout(() => setShowNotification(false), 3000);
    //     };

    //     socket.on('sessionStatus', handleSessionStatus);
    //     socket.on('updateGrid', handleUpdateGrid);
    //     socket.on('sessionEnded', handleSessionEnded);
    //     socket.on('success', handleSuccess);
    //     socket.on('error', handleError);

    //     if (selectedDepartment && selectedSemester && selectedSection) {
    //         socket.emit('getSessionStatus', {
    //             department: selectedDepartment,
    //             semester: selectedSemester,
    //             section: selectedSection
    //         });
    //     }

    //     return () => {
    //         socket.off('sessionStatus', handleSessionStatus);
    //         socket.off('updateGrid', handleUpdateGrid);
    //         socket.off('sessionEnded', handleSessionEnded);
    //         socket.off('success', handleSuccess);
    //         socket.off('error', handleError);
    //     };
    // }, [socket, selectedDepartment, selectedSemester, selectedSection]);

    useEffect(() => {
        if (sessionActive) {
            // Start the timer when session becomes active
            const interval = setInterval(() => {
                setSessionTimer(prevTime => prevTime + 1);
            }, 1000);
            setTimerInterval(interval);
        } else {
            // Clear the timer when session ends
            if (timerInterval) {
                clearInterval(timerInterval);
                setTimerInterval(null);
            }
            setSessionTimer(0);
        }
        
        // Cleanup function
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [sessionActive]);

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    };

    const startSession = () => {
        if (!selectedDepartment || !selectedSemester || !selectedSection) {
            showErrorMessage('Please select department, semester, and section');
            return;
        }

        // For roll-based attendance, total students is required
        if (attendanceType === 'roll' && (!totalStudents || isNaN(totalStudents) || totalStudents < 1)) {
            showErrorMessage('Please enter a valid number of students');
            return;
        }

        setShowNotification(false);
        setStartingSession(true);
        
        // Use QR system instead of old grid system
        socket.emit('qr-startSession', {
            department: selectedDepartment,
            semester: selectedSemester,
            section: selectedSection,
            totalStudents: parseInt(totalStudents || 0),
            sessionType: attendanceType
        });
        
        // Add a timeout to reset the loading state in case the server doesn't respond
        setTimeout(() => {
            setStartingSession(false);
        }, 5000);
    };

    // QR Session Handler Functions
    const handleLockSession = (sessionId) => {
        if (!socket) return;
        
        socket.emit('qr-lockSession', { sessionId });
    };

    const handleUnlockSession = (sessionId) => {
        if (!socket) return;
        
        socket.emit('qr-unlockSession', { sessionId });
    };

    const handleStartAttendance = (sessionId) => {
        if (!socket) return;
        
        socket.emit('qr-startAttendance', { sessionId });
    };

    const handleEndSession = (sessionId) => {
        if (!socket) return;
        
        socket.emit('qr-endSession', { sessionId });
    };

    const handleBroadcastJoinSession = (sessionId) => {
        if (!socket) return;
        
        socket.emit('qr-broadcastJoinSession', { sessionId });
    };

    const handleQRTokenRefresh = (newQRData) => {
        // Update the QR data state with the new token
        setQrData(newQRData);
    };

    const endSession = () => {
        if (!selectedDepartment || !selectedSemester || !selectedSection) {
            showErrorMessage('Please select department, semester, and section');
            return;
        }

        setShowNotification(false);
        setEndingSession(true);         
        
        socket.emit('endSession', {
            department: selectedDepartment,
            semester: selectedSemester,
            section: selectedSection
        });
        
        // Add a timeout to reset the loading state in case the server doesn't respond
        setTimeout(() => {
            setEndingSession(false);
        }, 5000);
    };

    const refreshCodes = () => {
        if (!selectedDepartment || !selectedSemester || !selectedSection) {
            showErrorMessage('Please select department, semester, and section');
            return;
        }

        setShowNotification(false);
        socket.emit('refreshCodes', {
            department: selectedDepartment,
            semester: selectedSemester,
            section: selectedSection
        });
    };

    const copyAbsentees = () => {
        if (sessionStats && sessionStats.absentees) {
            const text = sessionStats.absentees.join(', ');
            navigator.clipboard.writeText(text);
            setCopiedText('Copied!');
            setTimeout(() => setCopiedText(''), 2000);
        }
    };

    const generateReport = () => {
        if (!sessionStats) {
            showErrorMessage('No session data available for report generation');
            return;
        }

        showSuccessMessage('Generating report...');

        // Prepare the report data
        const reportData = {
            department: selectedDepartment,
            semester: selectedSemester,
            section: selectedSection,
            totalStudents: sessionStats.totalStudents,
            presentStudents: sessionStats.presentStudents || [],
            absentees: sessionStats.absentees || []
        };

        // Get the token from localStorage
        const token = localStorage.getItem('token');
        
        // Make API call to generate report
        fetch(`${BACKEND_URL}/api/reports/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(reportData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage('Report generated successfully!');
                
                // Send email with the report
                return fetch(`${BACKEND_URL}/api/reports/email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({
                        ...reportData,
                        presentCount: reportData.presentStudents.length,
                        absentCount: reportData.absentees.length,
                        reportFilePath: data.filePath
                    })
                });
            } else {
                throw new Error(data.message || 'Failed to generate report');
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage('Report sent to your email successfully!');
            } else {
                throw new Error(data.message || 'Failed to send report email');
            }
        })
        .catch(error => {
            console.error('Error generating or sending report:', error);
            showErrorMessage(`Error: ${error.message}`);
        });
    };

    // Function to download PDF for the current session
    const downloadPDF = async () => {
        if (!sessionStats) {
            showErrorMessage('No session data available for PDF download');
            return;
        }

        try {
            setDownloadingPdf(true);
            showSuccessMessage('Preparing PDF for download...');

            // Get the token from localStorage
            const token = localStorage.getItem('token');
            
            // Prepare the data for the attendance record
            const recordData = {
                department: selectedDepartment,
                semester: selectedSemester,
                section: selectedSection,
                totalStudents: sessionStats.totalStudents,
                presentStudents: sessionStats.presentStudents || [],
                absentees: sessionStats.absentees || [],
                sessionType: sessionStats.sessionType || 'roll'
            };

            // First, create or get the attendance record
            const createRecordResponse = await fetch(`${BACKEND_URL}/api/attendance/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(recordData)
            });

            const recordResult = await createRecordResponse.json();
            
            if (!recordResult.success && !recordResult._id) {
                throw new Error(recordResult.message || 'Failed to create attendance record');
            }

            // Now download the PDF directly
            const recordId = recordResult._id;
            const downloadUrl = `${BACKEND_URL}/api/attendance/records/${recordId}/download-pdf`;
            
            // Create a hidden anchor element to trigger the download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.target = '_blank';
            
            // Add the token to the URL as a query parameter
            link.href = `${downloadUrl}?token=${token}`;
            
            // Set download attribute to force download instead of navigation
            const dateStr = new Date().toISOString().split('T')[0];
            link.download = `attendance_${selectedDepartment}_${selectedSection}_${dateStr}.pdf`;
            
            // Append to body, click and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showSuccessMessage('PDF download started!');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showErrorMessage(`Error: ${error.message}`);
        } finally {
            setDownloadingPdf(false);
        }
    };

    const showNotificationMessage = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
        
        // Auto-hide notification after 10 seconds
        setTimeout(() => {
            setShowNotification(false);
        }, 10000);
    };

    const showSuccessMessage = (msg) => {
        showNotificationMessage(msg, 'success');
    };

    const showErrorMessage = (msg) => {
        showNotificationMessage(msg, 'error');
    };

    const renderContent = () => {
        if (loading) {
            return <div style={styles.loadingContainer}>Loading...</div>;
        }

        return (
            <div style={styles.container}>
                <h2 style={styles.title}>Faculty Dashboard</h2>
                
                <div style={styles.navBar}>
                    <button 
                        style={styles.navButton} 
                        onClick={() => navigate('/suspicious-activity')}
                    >
                        View Suspicious Devices
                    </button>
                    <button 
                        style={{...styles.navButton, marginLeft: '10px'}} 
                        onClick={() => navigate('/faculty/past-attendance')}
                    >
                        View Past Attendance
                    </button>
                </div>

                <div style={styles.controlPanel}>
                    <div style={styles.attendanceTypeSelector}>
                        <label style={styles.label}>Attendance Type:</label>
                        <div style={styles.attendanceTypeButtons}>
                            <button
                                onClick={() => setAttendanceType('roll')}
                                style={{
                                    ...styles.typeButton,
                                    backgroundColor: attendanceType === 'roll' ? '#4caf50' : '#f0f0f0',
                                    color: attendanceType === 'roll' ? 'white' : 'black'
                                }}
                                disabled={sessionActive}
                            >
                                Mark by Roll Number
                            </button>
                            <button
                                onClick={() => setAttendanceType('gmail')}
                                style={{
                                    ...styles.typeButton,
                                    backgroundColor: attendanceType === 'gmail' ? '#4caf50' : '#f0f0f0',
                                    color: attendanceType === 'gmail' ? 'white' : 'black'
                                }}
                                disabled={sessionActive}
                            >
                                Mark by Gmail
                            </button>
                        </div>
                    </div>

                    <div style={styles.assignmentsTableContainer}>
                        <p style={styles.tableSubtitle}>Click on a row to select a class for attendance</p>
                        
                        <div style={styles.tableWrapper}>
                            <table style={styles.assignmentsTable}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>Select</th>
                                        <th style={styles.tableHeader}>Department</th>
                                        <th style={styles.tableHeader}>Semester</th>
                                        <th style={styles.tableHeader}>Section</th>
                                        <th style={styles.tableHeader}>Total Students</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableTeachingAssignments.map((assignment, index) => {
                                        const isSelected = 
                                            selectedDepartment === user.department && 
                                            selectedSemester === assignment.semester && 
                                            selectedSection === assignment.section;
                                            
                                        return (
                                            <tr 
                                                key={index}
                                                style={{
                                                    ...styles.tableRow,
                                                    backgroundColor: isSelected ? '#e8f5e9' : 'transparent',
                                                    cursor: sessionActive ? 'not-allowed' : 'pointer',
                                                    border: isSelected ? '1px solid #4caf50' : '1px solid #eee'
                                                }}
                                                onClick={() => {
                                                    if (!sessionActive) {
                                                        setSelectedDepartment(user.department);
                                                        setSelectedSemester(assignment.semester);
                                                        setSelectedSection(assignment.section);
                                                    }
                                                }}
                                            >
                                                <td style={styles.checkboxCell}>
                                                    <div style={{
                                                        ...styles.customCheckbox,
                                                        backgroundColor: isSelected ? '#4caf50' : 'transparent',
                                                        border: isSelected ? '2px solid #4caf50' : '2px solid #ccc'
                                                    }}>
                                                        {isSelected && <span style={styles.checkmark}>✓</span>}
                                                    </div>
                                                </td>
                                                <td style={styles.tableCell}>{user.department}</td>
                                                <td style={styles.tableCell}>{assignment.semester}</td>
                                                <td style={styles.tableCell}>{assignment.section}</td>
                                                <td style={styles.tableCell}>
                                                    {attendanceType === 'roll' && (
                                                        <input
                                                            type="number"
                                                            value={isSelected ? totalStudents : ''}
                                                            onChange={(e) => {
                                                                if (isSelected) {
                                                                    setTotalStudents(e.target.value);
                                                                }
                                                            }}
                                                            onClick={(e) => {
                                                                // Prevent the row click event from triggering
                                                                e.stopPropagation();
                                                                // Select this row if not already selected
                                                                if (!sessionActive && !isSelected) {
                                                                    setSelectedDepartment(user.department);
                                                                    setSelectedSemester(assignment.semester);
                                                                    setSelectedSection(assignment.section);
                                                                }
                                                            }}
                                                            style={{
                                                                ...styles.tableInput,
                                                                borderColor: isSelected ? '#4caf50' : '#ddd',
                                                                backgroundColor: isSelected ? '#f0fff1' : '#fff'
                                                            }}
                                                            placeholder="Enter total"
                                                            min="1"
                                                            disabled={sessionActive}
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={styles.buttonGroup}>
                        <button
                            onClick={sessionActive ? endSession : startSession}
                            style={{
                                ...styles.button,
                                backgroundColor: sessionActive ? '#f44336' : '#4caf50',
                                flex: 2,
                                opacity: startingSession || endingSession ? 0.7 : 1,
                                cursor: startingSession || endingSession ? 'not-allowed' : 'pointer'
                            }}
                            disabled={startingSession || endingSession}
                        >
                            {sessionActive 
                                ? (endingSession ? 'Ending Session...' : 'End Session') 
                                : (startingSession ? 'Starting Session...' : 'Start Session')
                            }
                        </button>

                        {sessionActive && (
                            <button
                                onClick={refreshCodes}
                                style={{
                                    ...styles.button,
                                    backgroundColor: '#ff9800',
                                    flex: 1
                                }}
                            >
                                Refresh Codes
                            </button>
                        )}
                    </div>
                </div>

                {/* OLD GRID SYSTEM - COMMENTED OUT FOR QR SYSTEM */}
                {/* 
                {sessionActive && (
                    <div style={styles.sessionTimer}>
                        <span style={styles.timerLabel}>Session Time:</span>
                        <span style={styles.timerValue}>{formatTime(sessionTimer)}</span>
                    </div>
                )}

                {sessionActive && (
                    <div style={styles.gridContainer}>
                        <h3 style={styles.subtitle}>Attendance Grid</h3>
                        <div style={styles.grid}>
                            {grid.map((row, i) => (
                                <div key={i} style={styles.row}>
                                    {row.map((cell, j) => (
                                        <div
                                            key={`${i}-${j}`}
                                            style={{
                                                ...styles.gridCell,
                                                ...(cell.used ? styles.gridCellUsed : styles.gridCellUnused),
                                                cursor: 'pointer',
                                            }}
                                            className="grid-cell"
                                        >
                                            <div className="student-info-card">
                                                {cell.used ? (
                                                    <div className="student-info-content">
                                                        <h3>Student Information</h3>
                                                        <p><strong>Name:</strong> {cell.studentName || 'N/A'}</p>
                                                        <p><strong>Roll Number:</strong> {cell.studentRoll || 'N/A'}</p>
                                                        <p><strong>Section:</strong> {selectedSection}</p>
                                                        <p><strong>Email:</strong> {cell.studentEmail || 'N/A'}</p>
                                                        <p><strong>Status:</strong> <span className="verified">{cell.photoFilename ? 'Verified' : 'No Photo'}</span></p>
                                                    </div>
                                                ) : (
                                                    <div className="student-info-content">
                                                        <p>Not used</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {cell.used && cell.photoFilename && (
                                                <div style={styles.gridCellPhotoContainer}>
                                                    <img 
                                                        src={cell.cloudinaryUrl || `${BACKEND_URL}/api/photo-verification/${cell.photoFilename}`}
                                                        alt="Student"
                                                        style={styles.gridCellPhoto}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://via.placeholder.com/60?text=No+Photo';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div style={styles.gridCellCode}>
                                                {cell.code}
                                            </div>
                                            {cell.used && (
                                                <div style={{
                                                    ...styles.gridCellVerification,
                                                    ...(cell.photoFilename ? styles.gridCellVerificationVerified : styles.gridCellVerificationNoPhoto)
                                                }}>
                                                    {cell.photoFilename ? 'Verified' : 'No Photo'}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                */}

                {/* NEW QR ATTENDANCE SYSTEM */}
                {qrSessionActive && qrSessionData && (
                    <QRAttendancePanel
                        qrData={qrData}
                        sessionData={qrSessionData}
                        onLockSession={handleLockSession}
                        onUnlockSession={handleUnlockSession}
                        onStartAttendance={handleStartAttendance}
                        onEndSession={handleEndSession}
                        onBroadcastJoinSession={handleBroadcastJoinSession}
                        onQRTokenRefresh={handleQRTokenRefresh}
                        socket={socket}
                    />
                )}

                {sessionStats && sessionStats.sessionType !== 'gmail' && (
                    <div style={styles.sessionStats}>
                        <h3 style={styles.statsTitle}>Session Statistics</h3>
                        
                        <div style={styles.statsGrid}>
                            <div style={styles.statsItem}>
                                <div style={styles.statsLabel}>Attendance Type</div>
                                <div style={styles.statsValue}>Roll Number-based</div>
                            </div>
                            
                            <div style={styles.statsItem}>
                                <div style={styles.statsLabel}>Total Students</div>
                                <div style={styles.statsValue}>{sessionStats.totalStudents}</div>
                            </div>
                            
                            <div style={styles.statsItem}>
                                <div style={styles.statsLabel}>Present</div>
                                <div style={styles.statsValue}>
                                    <span style={{color: '#4caf50'}}>{sessionStats.presentCount}</span>
                                </div>
                            </div>
                            
                            <div style={styles.statsItem}>
                                <div style={styles.statsLabel}>Absent</div>
                                <div style={styles.statsValue}>
                                    <span style={{color: '#f44336'}}>{sessionStats.absentees.length}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div style={styles.absenteeList}>
                            <h4 style={styles.absenteeTitle}>Absentees:</h4>
                            <div style={styles.absenteeText}>
                                {sessionStats.absentees.join(', ')}
                                <button 
                                    onClick={copyAbsentees}
                                    style={styles.copyButton}
                                >
                                    {copiedText || 'Copy'}
                                </button>
                            </div>
                        </div>
                        
                        <div style={styles.reportButtonContainer}>
                            <button 
                                onClick={generateReport}
                                style={styles.reportButton}
                            >
                                Generate Report
                            </button>
                            <button 
                                onClick={downloadPDF}
                                style={{...styles.reportButton, marginLeft: '15px', backgroundColor: '#2196f3'}}
                                disabled={downloadingPdf}
                            >
                                {downloadingPdf ? 'Preparing...' : 'Download PDF'}
                            </button>
                        </div>
                    </div>
                )}
                
                {sessionStats && sessionStats.sessionType === 'gmail' && (
                    <div style={styles.gmailMessage}>
                        <div style={styles.gmailIcon}>✓</div>
                        <h3 style={styles.gmailTitle}>Gmail-based Attendance Session Ended</h3>
                        <p style={styles.gmailText}>Attendance data has been Updated Successfully.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderNotification = () => {
        if (!showNotification) return null;
        
        return (
            <div className={`notification-popup ${notificationType}`}>
                <div className="notification-icon">
                    <i className={`fas ${notificationType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                </div>
                <div className="notification-content">
                    <p>{notificationMessage}</p>
                </div>
                <button 
                    className="notification-close"
                    onClick={() => setShowNotification(false)}
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
        );
    };

    return (
        <div style={{width: '100%', margin: 0, padding: 0}}>
            <div style={styles.container}>
                {renderContent()}
                {renderNotification()}
            </div>
        </div>
    );
};

const styles = {
    container: {
        width: 'calc(100% - 30px)',
        margin: '0 15px',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box'
    },
    attendanceTypeSelector: {
        marginBottom: '20px',
        width: '100%'
    },
    attendanceTypeButtons: {
        display: 'flex',
        gap: '10px',
        marginTop: '5px'
    },
    typeButton: {
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        flex: 1,
        fontWeight: 'bold',
        transition: 'background-color 0.3s',
        color: 'black'
    },
    // New styles for the table-based UI
    assignmentsTableContainer: {
        marginBottom: '20px',
        width: '90%',  // Increased width
        maxWidth: '900px',  // Added max-width for better appearance
        margin: '0 auto 20px'  // Center the container
    },
    tableTitle: {
        fontSize: '20px',  // Increased font size
        marginBottom: '8px',
        color: '#333',
        fontWeight: 'bold'
    },
    tableSubtitle: {
        fontSize: '14px',
        color: '#666',
        marginBottom: '20px'  // Increased margin
    },
    tableWrapper: {
        overflowX: 'auto',
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',  // Enhanced shadow
        borderRadius: '10px',  // Increased border radius
        border: '1px solid #e0e0e0'  // Added border
    },
    assignmentsTable: {
        width: '100%',
        borderCollapse: 'separate',  // Changed to separate for better borders
        borderSpacing: '0',
        backgroundColor: '#fff'
    },
    tableHeader: {
        padding: '15px 20px',  // Increased padding
        textAlign: 'left',
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #ddd',  // Thicker border
        color: '#333',
        fontWeight: 'bold',
        fontSize: '15px'  // Increased font size
    },
    tableRow: {
        borderBottom: '1px solid #eee',
        transition: 'all 0.3s ease',  // Enhanced transition
        '&:hover': {
            backgroundColor: '#f9f9f9'  // Hover effect
        }
    },
    tableCell: {
        padding: '15px 20px',  // Increased padding
        textAlign: 'left',
        fontSize: '14px'  // Specified font size
    },
    tableInput: {
        width: '100%',
        padding: '10px 12px',  // Increased padding
        border: '1px solid #ddd',
        borderRadius: '6px',  // Increased border radius
        boxSizing: 'border-box',
        fontSize: '14px',  // Specified font size
        transition: 'all 0.3s ease'  // Added transition
    },
    // New styles for checkbox
    checkboxCell: {
        padding: '15px 10px 15px 20px',
        textAlign: 'center',
        width: '60px'
    },
    customCheckbox: {
        width: '22px',
        height: '22px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
    },
    checkmark: {
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold'
    },
    title: {
        fontSize: '32px',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: '30px',
        color: '#1a237e',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        padding: '15px 0',
        borderBottom: '3px solid #3f51b5',
        textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
    },
    subtitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '5px',
        color: '#283593',
    },
    controlPanel: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '10px',
        width: '80%',
        maxWidth: '100%',
        margin: '0 auto 20px auto',
    },
    formGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#424242',
    },
    select: {
        width: '100%',
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
        fontSize: '14px',
        backgroundColor: '#ffffff',
    },
    input: {
        width: '100%',
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
        fontSize: '14px',
    },
    button: {
        padding: '10px',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'all 0.3s',
        '&:hover': {
            opacity: 0.9,
            transform: 'translateY(-1px)'
        }
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px'
    },
    gridContainer: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '30px',
        width: '100%',  // Match the width of the control panel
        margin: '0 auto',  // Center the grid container
        overflow: 'visible',  // Allow hover cards to be visible outside the container
        position: 'relative',  // Establish positioning context
    },
    gridCell: {
        width: 'clamp(60px, 6vw, 90px)',  // Responsive width with min/max constraints
        height: 'clamp(60px, 6vw, 90px)',  // Responsive height with min/max constraints
        border: 'clamp(1px, 0.1vw, 2px) solid #ddd',  // Responsive border
        borderRadius: 'clamp(5px, 0.5vw, 10px)',  // Responsive border radius
        margin: 'clamp(1px, 0.2vw, 2px)',  // Responsive margin
        display: 'flex',
        fontSize: 'clamp(20px, 3vw, 31px)',  // Responsive font size
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'visible',
    },
    gridCellUsed: {
        backgroundColor: '#4caf50',
        color: 'white',
    },
    gridCellUnused: {
        backgroundColor: '#f5f5f5',
        color: '#333',
    },
    gridCellCode: {
        fontSize: 'clamp(20px, 3vw, 31px)',
        fontWeight: 'bold',
        position: 'relative',
    },
    gridCellVerification: {
        fontSize: 'clamp(12px, 2vw, 20px)',
        marginTop: 'clamp(1px, 0.2vw, 2px)',
        fontWeight: 'bold',
        position: 'relative',
    },
    gridCellVerificationVerified: {
        color: 'white',
    },
    gridCellVerificationNoPhoto: {
        color: '#ffeb3b',
    },
    gridCellPhotoContainer: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        borderRadius: 'clamp(5px, 0.5vw, 10px)',
        top: 0,
        left: 0,
        zIndex: 1,
    },
    gridCellPhoto: {
        width: '100%',
        height: '100%',
        borderRadius: 'clamp(5px, 0.5vw, 10px)',
        objectFit: 'cover',
    },
    grid: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
    },
    row: {
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'nowrap',
        gap: '10px',
        width: '100%',
    },
    sessionStats: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        margin: '20px 0',
        width: '100%',
    },
    statsTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '20px',
        color: '#1a237e',
        textAlign: 'center',
        borderBottom: '2px solid #3f51b5',
        paddingBottom: '10px',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '25px',
    },
    statsItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
        },
    },
    statsLabel: {
        color: '#757575',
        fontSize: '14px',
        marginBottom: '10px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    statsValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#283593',
    },
    absenteeList: {
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
    },
    absenteeTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#424242',
        marginBottom: '10px',
    },
    absenteeText: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '16px',
        lineHeight: '1.5',
        color: '#616161',
        wordBreak: 'break-word',
    },
    copyButton: {
        marginLeft: '15px',
        padding: '5px 15px',
        backgroundColor: '#3f51b5',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        minWidth: '80px',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: '#303f9f',
        },
    },
    reportButtonContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '25px',
    },
    reportButton: {
        padding: '12px 25px',
        backgroundColor: '#ff9800',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.3s',
        '&:hover': {
            backgroundColor: '#f57c00',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        },
    },
    gmailMessage: {
        backgroundColor: '#ffffff',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        margin: '20px 0',
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gmailIcon: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#4caf50',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: 'bold',
        marginBottom: '20px',
        boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)',
    },
    gmailTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '15px',
        color: '#1a237e',
    },
    gmailText: {
        fontSize: '16px',
        color: '#616161',
        marginBottom: '5px',
    },
    statsValue: {
        color: '#2196f3',
        fontSize: '28px',
        fontWeight: 'bold',
    },
    absenteesContainer: {
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
    },
    absenteesTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '15px',
    },
    absenteesList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
    },
    absenteeItem: {
        backgroundColor: '#ffffff',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#f44336',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    copyButton: {
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background-color 0.3s',
        '&:hover': {
            backgroundColor: '#1976d2',
        },
    },
    navBar: {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
    },
    navButton: {
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background-color 0.3s',
        '&:hover': {
            backgroundColor: '#1976d2',
        },
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
    },
    sessionTimer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 100,
    },
    timerLabel: {
        fontWeight: 'bold',
        marginRight: '10px',
        color: '#555',
    },
    timerValue: {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#2196f3',
        fontWeight: 'bold',
    },
    markedCell: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#66bb6a',
        borderRadius: '10px',
        overflow: 'hidden',
    },
    studentPhoto: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    studentInfo: {
        textAlign: 'center',
    },
    studentName: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#ffffff',
        textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
    },
    studentRoll: {
        fontSize: '12px',
        color: '#ffffff',
        textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
    },
};

export default FacultyDashboard;