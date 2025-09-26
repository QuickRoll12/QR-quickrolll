import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import '../styles/QRAttendancePanel.css';

const QRAttendancePanel = ({ 
    qrData, 
    sessionData, 
    onLockSession, 
    onUnlockSession,
    onStartAttendance, 
    onEndSession,
    onQRTokenRefresh,
    socket 
}) => {
    const [timeLeft, setTimeLeft] = useState(5);
    const [studentsJoined, setStudentsJoined] = useState(sessionData?.studentsJoined || []);
    const [studentsPresent, setStudentsPresent] = useState(sessionData?.studentsPresent || []);
    const [liveStats, setLiveStats] = useState({
        totalJoined: 0,
        totalPresent: 0,
        presentPercentage: 0
    });
    
    const timerRef = useRef(null);
    const qrDisplayRef = useRef(null);

    // Timer effect for QR countdown
    useEffect(() => {
        if (qrData && sessionData?.status === 'active') {
            setTimeLeft(5);
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        return 5; // Reset to 5 when it reaches 0
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        
        return () => {
            clearInterval(timerRef.current);
        };
    }, [qrData, sessionData?.status]);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleStudentJoined = (data) => {
            setStudentsJoined(prev => [...prev, data]);
            setLiveStats(prev => ({
                ...prev,
                totalJoined: prev.totalJoined + 1
            }));
        };

        const handleAttendanceUpdate = (data) => {
            // Add the new student to the present list
            setStudentsPresent(prev => {
                const newStudent = {
                    studentName: data.studentName,
                    rollNumber: data.rollNumber,
                    markedAt: data.markedAt
                };
                return [...prev, newStudent];
            });
            
            // Update live stats with actual data from backend
            setLiveStats({
                totalJoined: studentsJoined.length,
                totalPresent: data.totalPresent,
                presentPercentage: data.presentPercentage || 0
            });
        };

        const handleQRTokenRefresh = (newQRData) => {
            // Update QR data with new token
            if (onQRTokenRefresh) {
                onQRTokenRefresh(newQRData);
            }
            // Reset timer
            setTimeLeft(5);
        };

        socket.on('qr-studentJoined', handleStudentJoined);
        socket.on('qr-attendanceUpdate', handleAttendanceUpdate);
        socket.on('qr-tokenRefresh', handleQRTokenRefresh);

        return () => {
            socket.off('qr-studentJoined', handleStudentJoined);
            socket.off('qr-attendanceUpdate', handleAttendanceUpdate);
            socket.off('qr-tokenRefresh', handleQRTokenRefresh);
        };
    }, [socket, studentsJoined.length, onQRTokenRefresh]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'created': return '#2196f3';
            case 'locked': return '#ff9800';
            case 'active': return '#4caf50';
            case 'ended': return '#9e9e9e';
            default: return '#2196f3';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'created': return 'Session Created - Students can join';
            case 'locked': return 'Session Locked - Ready to start attendance';
            case 'active': return 'Attendance Active - Students scanning QR';
            case 'ended': return 'Session Ended';
            default: return 'Unknown Status';
        }
    };

    return (
        <div className="qr-attendance-panel">
            {/* Session Status Header */}
            <div className="session-status-header">
                <div className="status-indicator">
                    <div 
                        className="status-dot"
                        style={{ backgroundColor: getStatusColor(sessionData?.status) }}
                    ></div>
                    <span className="status-text">{getStatusText(sessionData?.status)}</span>
                </div>
                <div className="session-info">
                    <span>{sessionData?.department} - {sessionData?.semester} - {sessionData?.section}</span>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="control-buttons">
                {sessionData?.status === 'created' && (
                    <button 
                        className="control-btn lock-btn"
                        onClick={() => onLockSession(sessionData.sessionId)}
                    >
                        🔒 Lock Session
                    </button>
                )}
                
                {sessionData?.status === 'locked' && (
                    <>
                        <button 
                            className="control-btn unlock-btn"
                            onClick={() => onUnlockSession(sessionData.sessionId)}
                        >
                            🔓 Unlock Session
                        </button>
                        <button 
                            className="control-btn start-btn"
                            onClick={() => onStartAttendance(sessionData.sessionId)}
                        >
                            📱 Start Attendance
                        </button>
                    </>
                )}
                
                {(sessionData?.status === 'active' || sessionData?.status === 'locked') && (
                    <button 
                        className="control-btn end-btn"
                        onClick={() => onEndSession(sessionData.sessionId)}
                    >
                        🏁 End Session
                    </button>
                )}
            </div>

            {/* QR Code Display */}
            {sessionData?.status === 'active' && qrData && (
                <div className="qr-display-container">
                    <div className="qr-display" ref={qrDisplayRef}>
                        <div className="qr-header">
                            <h3>Scan QR Code to Mark Attendance</h3>
                            <div className="qr-timer">
                                <div className="timer-circle">
                                    <svg className="timer-svg" viewBox="0 0 36 36">
                                        <path
                                            className="timer-bg"
                                            d="M18 2.0845
                                               a 15.9155 15.9155 0 0 1 0 31.831
                                               a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        <path
                                            className="timer-progress"
                                            strokeDasharray={`${(timeLeft / 5) * 100}, 100`}
                                            d="M18 2.0845
                                               a 15.9155 15.9155 0 0 1 0 31.831
                                               a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <div className="timer-text">{timeLeft}s</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="qr-code-wrapper">
                            <div className="qr-code">
                                <QRCode 
                                    value={qrData.token}
                                    size={280}
                                    style={{ height: "280px", width: "280px" }}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                />
                            </div>
                            <div className="qr-refresh-indicator">
                                <div className="refresh-pulse"></div>
                            </div>
                        </div>
                        
                        <div className="qr-info">
                            <p>QR Code #{qrData.refreshCount || 1}</p>
                            <p>Auto-refreshes every 5 seconds</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Statistics */}
            <div className="live-stats">
                <div className="stats-header">
                    <h3>Live Statistics</h3>
                    <div className="stats-refresh">
                        <div className="pulse-dot"></div>
                        <span>Live</span>
                    </div>
                </div>
                
                <div className="stats-grid">
                    <div className="stat-card total-students">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <div className="stat-number">{sessionData?.totalStudents || 0}</div>
                            <div className="stat-label">Total Students</div>
                        </div>
                    </div>
                    
                    <div className="stat-card joined-students">
                        <div className="stat-icon">🚪</div>
                        <div className="stat-content">
                            <div className="stat-number">{liveStats.totalJoined}</div>
                            <div className="stat-label">Students Joined</div>
                        </div>
                    </div>
                    
                    <div className="stat-card present-students">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <div className="stat-number">{liveStats.totalPresent}</div>
                            <div className="stat-label">Present Students</div>
                            {studentsPresent.length > 0 && (
                                <div className="roll-numbers">
                                    {studentsPresent.map((student, index) => (
                                        <span key={index} className="roll-number">
                                            {student.rollNumber}
                                        </span>
                                    )).slice(0, 10)} {/* Show first 10 */}
                                    {studentsPresent.length > 10 && (
                                        <span className="roll-number more">+{studentsPresent.length - 10}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="stat-card attendance-percentage">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <div className="stat-number">{liveStats.presentPercentage}%</div>
                            <div className="stat-label">Attendance</div>
                        </div>
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="attendance-progress">
                    <div className="progress-label">
                        <span>Attendance Progress</span>
                        <span>{liveStats.totalPresent}/{sessionData?.totalStudents || 0}</span>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill"
                            style={{ width: `${liveStats.presentPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            {studentsPresent.length > 0 && (
                <div className="recent-activity">
                    <h3>Recent Attendance</h3>
                    <div className="activity-list">
                        {studentsPresent.slice(-5).reverse().map((student, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-avatar">
                                    {student.studentName?.charAt(0) || '?'}
                                </div>
                                <div className="activity-content">
                                    <div className="activity-name">{student.studentName}</div>
                                    <div className="activity-details">
                                        Roll: {student.rollNumber} • {new Date(student.markedAt).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div className="activity-status">✅</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRAttendancePanel;
