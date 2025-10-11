import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import QRCode from 'react-qr-code';
import axios from 'axios';
import '../styles/QRAttendancePanel.css';

const QRAttendancePanel = memo(({ 
    qrData, 
    sessionData, 
    onLockSession, 
    onUnlockSession,
    onStartAttendance, 
    onEndSession,
    onBroadcastJoinSession,
    onQRTokenRefresh,
    socket,
    isGroupSession
}) => {
    // STATE MANAGEMENT - Simplified to only store necessary data
    const [timeLeft, setTimeLeft] = useState(5);
    const [liveStats, setLiveStats] = useState({
        totalJoined: sessionData?.studentsJoinedCount || 0,
        totalPresent: sessionData?.studentsPresentCount || 0,
        presentPercentage: 0 // Will be calculated in effect
    });
    
    const timerRef = useRef(null);

    // EFFECT: Synchronize component state with parent props (sessionData)
    // This acts as the master source of truth for initializing and resetting state.
    useEffect(() => {
        if (sessionData) {
            let totalStudents, presentCount, joinedCount;
            
            if (isGroupSession) {
                // For group sessions, calculate total students across all sections
                totalStudents = sessionData.totalStudentsAcrossSections || 
                               (sessionData.sections ? sessionData.sections.reduce((sum, section) => sum + (section.totalStudents || 0), 0) : 0);
                presentCount = sessionData.totalStudentsPresent || 0;
                joinedCount = sessionData.totalStudentsJoined || 0;
            } else {
                // For single sessions, use existing logic
                totalStudents = sessionData.totalStudents || 0;
                presentCount = sessionData.studentsPresentCount || 0;
                joinedCount = sessionData.studentsJoinedCount || 0;
            }

            setLiveStats({
                totalJoined: joinedCount,
                totalPresent: presentCount,
                presentPercentage: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
            });
        }
    }, [sessionData, isGroupSession]);

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
    useEffect(() => {
        if (!socket) return;

        // Handles students joining the session lobby.
        const handleStudentJoined = () => {
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
    }, [socket, onQRTokenRefresh]);

    // POLLING LOGIC: Fetches marked attendance stats from the database.
    const pollAttendanceStats = useCallback(async () => {
        // For group sessions, check if we have groupSessionId, for single sessions check sessionId
        const sessionIdentifier = isGroupSession ? sessionData?.groupSessionId : sessionData?.sessionId;
        
        // This condition prevents unnecessary API calls.
        if (!sessionIdentifier || sessionData?.status !== 'active') return;
        
        try {
            // 1. Get the authentication token from local storage.
            const token = localStorage.getItem('token');
    
            // 2. Define the backend URL from environment variables, with a fallback for local development.
            const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
            
            // 3. Construct the complete, absolute URL for the API endpoint based on session type.
            let url;
            if (isGroupSession) {
                // For group sessions, use the group session stats endpoint
                url = `${BACKEND_URL}/api/qr-attendance/group-session/${sessionIdentifier}/stats`;
            } else {
                // For single sessions, use the existing single session stats endpoint
                url = `${BACKEND_URL}/api/qr-attendance/session/${sessionIdentifier}/stats`;
            }
    
            // 4. Make the GET request using axios.
            const response = await axios.get(
                url,
                {
                    headers: {
                        // Pass the token in the Authorization header.
                        Authorization: `Bearer ${token}`
                    }
                }
            );
    
            // 5. With axios, the JSON data is directly available on `response.data`.
            const stats = response.data;
            
            // 6. Safely update the component's state with the new stats.
            setLiveStats(prev => ({
                ...prev,
                totalPresent: stats.totalPresent || 0,
                presentPercentage: stats.presentPercentage || 0
            }));
    
        } catch (error) {
            // Axios automatically throws an error for non-2xx responses, which will be caught here.
            // We can log more detailed error information from the axios error object.
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error(`Failed to fetch ${isGroupSession ? 'group' : 'single'} session stats:`, error.response.status, error.response.data);
            } else if (error.request) {
                // The request was made but no response was received
                console.error(`Error polling ${isGroupSession ? 'group' : 'single'} session attendance stats: No response from server.`, error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error(`Error polling ${isGroupSession ? 'group' : 'single'} session attendance stats:`, error.message);
            }
        }
    }, [sessionData?.sessionId, sessionData?.groupSessionId, sessionData?.status, isGroupSession]);

    // EFFECT: Manages the polling interval.
    useEffect(() => {
        if (sessionData?.status !== 'active') return;

        pollAttendanceStats();
        const interval = setInterval(pollAttendanceStats, 6000);

        return () => clearInterval(interval);
    }, [sessionData?.status, pollAttendanceStats]);

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
                    {isGroupSession ? (
                        <span>Group Session - {sessionData?.sections?.length || 0} Sections</span>
                    ) : (
                        <span>{sessionData?.department} - {sessionData?.semester} - {sessionData?.section}</span>
                    )}
                </div>
            </div>

            {/* Control Buttons */}
            <div className="control-buttons">
                {sessionData?.status === 'created' && (
                    <>
                        <button className="control-btn broadcast-btn" onClick={() => onBroadcastJoinSession(isGroupSession ? sessionData.groupSessionId : sessionData.sessionId)}>
                            📢 Notify
                        </button>
                        <button className="control-btn lock-btn" onClick={() => onLockSession(isGroupSession ? sessionData.groupSessionId : sessionData.sessionId)}>
                            🔒 Lock Session
                        </button>
                    </>
                )}
                
                {sessionData?.status === 'locked' && (
                    <>
                        <button className="control-btn unlock-btn" onClick={() => onUnlockSession(isGroupSession ? sessionData.groupSessionId : sessionData.sessionId)}>
                            🔓 Unlock Session
                        </button>
                        <button className="control-btn start-btn" onClick={() => onStartAttendance(isGroupSession ? sessionData.groupSessionId : sessionData.sessionId)}>
                            📱 Start Attendance
                        </button>
                    </>
                )}
                
                {(sessionData?.status === 'active' || sessionData?.status === 'locked') && (
                    <button className="control-btn end-btn" onClick={() => onEndSession(isGroupSession ? sessionData.groupSessionId : sessionData.sessionId)}>
                        🏁 End Session
                    </button>
                )}
            </div>

            {/* Main Interactive Panel */}
            <div className="interactive-panel">
                <div className="panel-content-wrapper">
                    {/* Panel Header */}
                    <div className="qr-header">
                        <div className="qr-title-section">
                            <div className="qr-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 11V3H11V11H3ZM5 9H9V5H5V9ZM13 3H21V11H13V3ZM15 5V9H19V5H15ZM3 21V13H11V21H3ZM5 19H9V15H5V19ZM18 13H16V15H18V13ZM20 13H22V15H20V13ZM16 15H14V17H16V15ZM14 17H12V19H14V17ZM16 17H18V19H16V17ZM18 19H20V21H18V19ZM20 19H22V21H20V19Z" fill="url(#qrGradient)"/>
                                    <defs><linearGradient id="qrGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#667eea"/><stop offset="100%" stopColor="#764ba2"/></linearGradient></defs>
                                </svg>
                            </div>
                            <div className="qr-title-text">
                                <h3>Live Attendance Panel</h3>
                                <p className="qr-subtitle">Scan QR or monitor live statistics</p>
                            </div>
                        </div>
                        <div className="qr-timer">
                            <div className="timer-circle">
                                <svg className="timer-svg" viewBox="0 0 36 36">
                                    <path className="timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                    <path className="timer-progress" strokeDasharray={`${(timeLeft / 5) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                </svg>
                                <div className="timer-text">{timeLeft}s</div>
                            </div>
                            <span className="timer-label">Next Refresh</span>
                        </div>
                    </div>
                    
                    {/* Panel Body */}
                    <div className="qr-stats-body">
                        {/* Left Stats */}
                        <div className="stats-column">
                            <div className="stat-card">
                                <div className="stat-icon">👥</div>
                                <div className="stat-number">{sessionData?.totalStudents || 0}</div>
                                <div className="stat-label">Total Students</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">🚪</div>
                                <div className="stat-number">{liveStats.totalJoined}</div>
                                <div className="stat-label">Joined Session</div>
                            </div>
                        </div>
                        
                        {/* QR Code */}
                        {sessionData?.status === 'active' && qrData && (
                            <div className="qr-code-wrapper">
                                <div className="qr-code-frame">
                                    <div className="qr-corner-tl"></div>
                                    <div className="qr-corner-tr"></div>
                                    <div className="qr-corner-bl"></div>
                                    <div className="qr-corner-br"></div>
                                    <div className="qr-code">
                                        <QRCode value={qrData.token} size={380} style={{ height: "380px", width: "380px" }} bgColor="#ffffff" fgColor="#1a1a1a" level="H" includeMargin={false} />
                                    </div>
                                    <div className="qr-scan-line"></div>
                                </div>
                            </div>
                        )}

                        {/* Right Stats */}
                        <div className="stats-column">
                            <div className="stat-card">
                                <div className="stat-icon">✅</div>
                                <div className="stat-number">{liveStats.totalPresent}</div>
                                <div className="stat-label">Present</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">📊</div>
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
                            <div className="progress-fill" style={{ width: `${liveStats.presentPercentage}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* "Recent Activity" section has been removed as per your request */}
        </div>
    );
});

export default QRAttendancePanel;