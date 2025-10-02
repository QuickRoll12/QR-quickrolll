import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import QRCode from 'react-qr-code';
import '../styles/QRAttendancePanel.css';

const QRAttendancePanel = memo(({ 
    qrData, 
    sessionData, 
    onLockSession, 
    onUnlockSession,
    onStartAttendance, 
    onEndSession,
    onQRTokenRefresh,
    socket 
}) => {
    // STATE MANAGEMENT
    const [timeLeft, setTimeLeft] = useState(5);
    const [studentsJoined, setStudentsJoined] = useState(sessionData?.studentsJoined || []);
    const [studentsPresent, setStudentsPresent] = useState(sessionData?.studentsPresent || []);
    const [liveStats, setLiveStats] = useState({
        totalJoined: sessionData?.studentsJoined?.length || 0,
        totalPresent: sessionData?.studentsPresent?.length || 0,
        presentPercentage: 0 // Will be calculated in effect
    });
    
    const timerRef = useRef(null);
    const qrDisplayRef = useRef(null);

    // EFFECT: Synchronize component state with parent props (sessionData)
    // This acts as the master source of truth. Whenever the parent sends updated sessionData,
    // the component's internal state resets to match it.
    useEffect(() => {
        if (sessionData) {
            const totalStudents = sessionData.totalStudents || 0;
            const presentCount = sessionData.studentsPresent?.length || 0;
            const joinedCount = sessionData.studentsJoined?.length || 0;

            setStudentsJoined(sessionData.studentsJoined || []);
            setStudentsPresent(sessionData.studentsPresent || []);
            setLiveStats({
                totalJoined: joinedCount,
                totalPresent: presentCount,
                presentPercentage: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
            });
        }
    }, [sessionData]);

    // EFFECT: Manages the 5-second countdown timer for the QR code refresh.
    useEffect(() => {
        if (qrData && sessionData?.status === 'active') {
            setTimeLeft(5);
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => (prev <= 1 ? 5 : prev - 1));
            }, 1000);
        }
        
        return () => {
            clearInterval(timerRef.current);
        };
    }, [qrData, sessionData?.status]);

    // EFFECT: Sets up WebSocket listeners for real-time events.
    // This is optimized to run only when the socket connection changes.
    useEffect(() => {
        if (!socket) return;

        // Handles students joining the session lobby.
        const handleStudentJoined = (data) => {
            setStudentsJoined(prev => [...prev, data]);
            // Safely update only the 'totalJoined' stat, preserving other stats.
            setLiveStats(prev => ({
                ...prev,
                totalJoined: prev.totalJoined + 1
            }));
        };

        // Handles the QR token being refreshed by the server.
        const handleQRTokenRefresh = (newQRData) => {
            if (onQRTokenRefresh) {
                onQRTokenRefresh(newQRData);
            }
            setTimeLeft(5);
        };

        socket.on('qr-studentJoined', handleStudentJoined);
        socket.on('qr-tokenRefresh', handleQRTokenRefresh);

        // Cleanup: remove listeners when the component unmounts or socket changes.
        return () => {
            socket.off('qr-studentJoined', handleStudentJoined);
            socket.off('qr-tokenRefresh', handleQRTokenRefresh);
        };
    }, [socket, onQRTokenRefresh]); // Dependencies are stable, so this effect runs once.

    // POLLING LOGIC: Fetches marked attendance stats directly from the database via an API.
    // This is the primary source of truth for 'studentsPresent'.
    const pollAttendanceStats = useCallback(async () => {
        if (!sessionData?.sessionId || sessionData.status !== 'active') return;
        
        try {
            const response = await fetch(`/api/qr-attendance/session/${sessionData.sessionId}/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const stats = await response.json();
                
                // Update state with fresh data from the database.
                // Using new array/object references ensures React re-renders.
                setStudentsPresent([...stats.studentsPresent] || []);

                // Safely update the presentation stats, preserving the 'totalJoined' from sockets.
                setLiveStats(prev => ({
                    ...prev,
                    totalPresent: stats.totalPresent || 0,
                    presentPercentage: stats.presentPercentage || 0
                }));
            } else {
                console.error('Failed to fetch stats:', response.status);
            }
        } catch (error) {
            console.error('Error polling attendance stats:', error);
        }
    }, [sessionData?.sessionId, sessionData?.status]); // useCallback ensures this function is stable.

    // EFFECT: Manages the polling interval.
    useEffect(() => {
        if (sessionData?.status !== 'active') return;

        // Poll immediately on activation and then every 3 seconds.
        pollAttendanceStats();
        const interval = setInterval(pollAttendanceStats, 3000);

        return () => clearInterval(interval);
    }, [sessionData?.status, pollAttendanceStats]); // Re-runs if status changes or poll function updates.

    // --- Helper Functions for Rendering ---
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
                    <button className="control-btn lock-btn" onClick={() => onLockSession(sessionData.sessionId)}>
                        🔒 Lock Session
                    </button>
                )}
                
                {sessionData?.status === 'locked' && (
                    <>
                        <button className="control-btn unlock-btn" onClick={() => onUnlockSession(sessionData.sessionId)}>
                            🔓 Unlock Session
                        </button>
                        <button className="control-btn start-btn" onClick={() => onStartAttendance(sessionData.sessionId)}>
                            📱 Start Attendance
                        </button>
                    </>
                )}
                
                {(sessionData?.status === 'active' || sessionData?.status === 'locked') && (
                    <button className="control-btn end-btn" onClick={() => onEndSession(sessionData.sessionId)}>
                        🏁 End Session
                    </button>
                )}
            </div>

            {/* QR Code Display */}
            {sessionData?.status === 'active' && qrData && (
                <div className="qr-display-container">
                    <div className="qr-display" ref={qrDisplayRef}>
                         {/* Modern Header with Gradient */}
                         <div className="qr-header">
                            <div className="qr-title-section">
                                <div className="qr-icon">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11V3H11V11H3ZM5 9H9V5H5V9ZM13 3H21V11H13V3ZM15 5V9H19V5H15ZM3 21V13H11V21H3ZM5 19H9V15H5V19ZM18 13H16V15H18V13ZM20 13H22V15H20V13ZM16 15H14V17H16V15ZM14 17H12V19H14V17ZM16 17H18V19H16V17ZM18 19H20V21H18V19ZM20 19H22V21H20V19Z" fill="url(#qrGradient)"/><defs><linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#667eea"/><stop offset="100%" stopColor="#764ba2"/></linearGradient></defs></svg>
                                </div>
                                <div className="qr-title-text">
                                    <h3>Scan QR Code to Mark Attendance</h3>
                                    <p className="qr-subtitle">Point your camera at the QR code below</p>
                                </div>
                            </div>
                            <div className="qr-timer">
                                <div className="timer-circle">
                                    <svg className="timer-svg" viewBox="0 0 36 36"><path className="timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/><path className="timer-progress" strokeDasharray={`${(timeLeft / 5) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/></svg>
                                    <div className="timer-text">{timeLeft}s</div>
                                </div>
                                <span className="timer-label">Next Refresh</span>
                            </div>
                        </div>
                        
                        {/* QR Code Container */}
                        <div className="qr-main-container">
                            <div className="qr-code-wrapper">
                                <div className="qr-code-frame">
                                    <div className="qr-corner-tl"></div><div className="qr-corner-tr"></div><div className="qr-corner-bl"></div><div className="qr-corner-br"></div>
                                    <div className="qr-code">
                                        <QRCode value={qrData.token} size={380} style={{ height: "380px", width: "380px" }} bgColor="#ffffff" fgColor="#1a1a1a" level="H" includeMargin={false} />
                                    </div>
                                    <div className="qr-scan-line"></div>
                                </div>
                                <div className="qr-refresh-indicator"><div className="refresh-pulse"></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Statistics */}
            <div className="live-stats">
                <div className="stats-header">
                    <h3>Live Statistics</h3>
                    <div className="stats-refresh"><div className="pulse-dot"></div><span>Live</span></div>
                </div>
                <div className="stats-grid">
                    <div className="stat-card total-students"><div className="stat-icon">👥</div><div className="stat-content"><div className="stat-number">{sessionData?.totalStudents || 0}</div><div className="stat-label">Total Students</div></div></div>
                    <div className="stat-card joined-students"><div className="stat-icon">🚪</div><div className="stat-content"><div className="stat-number">{liveStats.totalJoined}</div><div className="stat-label">Joined Students</div></div></div>
                    <div className="stat-card present-students">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <div className="stat-number">{liveStats.totalPresent}</div>
                            <div className="stat-label">Present Students</div>
                            {studentsPresent.length > 0 && (
                                <div className="roll-numbers">
                                    {studentsPresent.slice(0, 10).map((student) => (
                                        <span key={student.rollNumber} className="roll-number">{student.rollNumber}</span>
                                    ))}
                                    {studentsPresent.length > 10 && (
                                        <span className="roll-number more">+{studentsPresent.length - 10}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="stat-card attendance-percentage"><div className="stat-icon">📊</div><div className="stat-content"><div className="stat-number">{liveStats.presentPercentage}%</div></div></div>
                </div>
                <div className="attendance-progress">
                    <div className="progress-label"><span>Attendance Progress</span><span>{liveStats.totalPresent}/{sessionData?.totalStudents || 0}</span></div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${liveStats.presentPercentage}%` }}></div></div>
                </div>
            </div>

            {/* Recent Activity */}
            {studentsPresent.length > 0 && (
                <div className="recent-activity">
                    <h3>Recent Attendance</h3>
                    <div className="activity-list">
                        {studentsPresent.slice(-5).reverse().map((student, index) => (
                            <div key={`${student.rollNumber}-${index}`} className="activity-item">
                                <div className="activity-avatar">{student.studentName?.charAt(0) || '?'}</div>
                                <div className="activity-content">
                                    <div className="activity-name">{student.studentName}</div>
                                    <div className="activity-details">Roll: {student.rollNumber} • {new Date(student.markedAt).toLocaleTimeString()}</div>
                                </div>
                                <div className="activity-status">✅</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default QRAttendancePanel;