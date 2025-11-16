import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const SuspiciousActivity = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [suspiciousUsers, setSuspiciousUsers] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'faculty')) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        const fetchSuspiciousActivity = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('token');
                // Fix the environment variable to match what's used in the rest of the app
                const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
                const response = await axios.get(`${BACKEND_URL}/api/faculty/suspicious-activity`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSuspiciousUsers(response.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch suspicious activity');
            } finally {
                setIsLoading(false);
            }
        };

        if (user?.role === 'faculty') {
            fetchSuspiciousActivity();
            // Refresh data every minute
            const interval = setInterval(fetchSuspiciousActivity, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const styles = {
        container: {
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto',
            minHeight: '100vh',
            backgroundColor: '#f5f5f5'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        title: {
            color: '#1a237e',
            margin: '0',
            fontSize: '24px',
            fontWeight: '600'
        },
        cardContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px',
            marginTop: '20px'
        },
        card: {
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
                transform: 'translateY(-5px)'
            }
        },
        cardTitle: {
            color: '#d32f2f',
            marginBottom: '15px',
            fontSize: '18px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        cardInfo: {
            marginBottom: '12px',
            color: '#424242',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        label: {
            fontWeight: '600',
            color: '#1a237e',
            minWidth: '100px'
        },
        error: {
            color: '#d32f2f',
            textAlign: 'center',
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            border: '1px solid #ffcdd2'
        },
        backButton: {
            backgroundColor: '#1a237e',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s ease',
            '&:hover': {
                backgroundColor: '#283593'
            }
        },
        loadingContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px'
        },
        noDataContainer: {
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            color: '#666'
        },
        timestamp: {
            color: '#666',
            fontSize: '12px',
            marginTop: '10px',
            textAlign: 'right'
        },
        badge: {
            backgroundColor: '#ff5252',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500'
        }
    };

    if (loading || isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <div>Loading...</div>
                </div>
            </div>
        );
    }

    const formattedDate = new Intl.DateTimeFormat('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
    }).format(new Date());

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Suspicious Activity Report</h2>
                <button 
                    style={styles.backButton}
                    onClick={() => navigate('/faculty')}
                >
                    ← Back to Dashboard
                </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            
            <div style={styles.cardContainer}>
                {suspiciousUsers.length > 0 ? (
                    suspiciousUsers.map((user, index) => {
                        const isCameraViolation = user.violationType === 'CAMERA_MONITORING';
                        const violationDate = new Date(user.timestamp);
                        const indianDate = violationDate.toLocaleDateString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        const indianTime = violationDate.toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                        });

                        return (
                            <div 
                                key={index} 
                                style={{
                                    ...styles.card,
                                    borderLeft: `6px solid ${isCameraViolation ? '#e74c3c' : '#f39c12'}`,
                                    background: isCameraViolation 
                                        ? 'linear-gradient(135deg, #fdf2f2, #ffffff)' 
                                        : 'linear-gradient(135deg, #fef9e7, #ffffff)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Decorative corner */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: '80px',
                                    height: '80px',
                                    background: `linear-gradient(135deg, ${isCameraViolation ? '#e74c3c20' : '#f39c1220'}, transparent)`,
                                    borderRadius: '0 0 0 80px'
                                }}></div>

                                <div style={{
                                    ...styles.cardTitle,
                                    background: isCameraViolation 
                                        ? 'linear-gradient(135deg, #e74c3c, #c0392b)' 
                                        : 'linear-gradient(135deg, #f39c12, #e67e22)',
                                    color: 'white',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {isCameraViolation ? '📹' : '🌐'} 
                                        {isCameraViolation ? 'Camera Violation' : 'VPN Detection'}
                                    </span>
                                    <span style={{
                                        ...styles.badge,
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        color: 'white',
                                        border: '1px solid rgba(255, 255, 255, 0.3)'
                                    }}>
                                        {isCameraViolation ? 'HIGH' : 'MEDIUM'}
                                    </span>
                                </div>

                                {/* Student Info Section */}
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    border: '1px solid rgba(0, 0, 0, 0.05)'
                                }}>
                                    <div style={{
                                        ...styles.cardInfo,
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: '#2c3e50',
                                        marginBottom: '12px',
                                        borderBottom: '2px solid #ecf0f1',
                                        paddingBottom: '8px'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            👤 {user.name}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                                        <div style={styles.cardInfo}>
                                            <span style={styles.label}>Roll Number:</span>
                                            <span style={{ fontWeight: '600', color: '#2c3e50' }}>{user.classRollNumber}</span>
                                        </div>
                                        <div style={styles.cardInfo}>
                                            <span style={styles.label}>Section:</span>
                                            <span style={{ fontWeight: '600', color: '#2c3e50' }}>{user.section}</span>
                                        </div>
                                        {user.course && (
                                            <div style={styles.cardInfo}>
                                                <span style={styles.label}>Course:</span>
                                                <span style={{ fontWeight: '600', color: '#2c3e50' }}>{user.course}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Violation Details */}
                                <div style={{
                                    background: isCameraViolation 
                                        ? 'linear-gradient(135deg, #fdf2f2, #fef5f5)' 
                                        : 'linear-gradient(135deg, #fef9e7, #fffbf0)',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    border: `1px solid ${isCameraViolation ? '#fecaca' : '#fed7aa'}`
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '8px',
                                        color: isCameraViolation ? '#c0392b' : '#e67e22',
                                        fontWeight: '600'
                                    }}>
                                        📋 Reason: {user.reason}
                                    </div>
                                    
                                    {!isCameraViolation && user.ipAddress && (
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#666' }}>
                                            <span>🌐 IP: {user.ipAddress}</span>
                                            {user.country && <span>🗺️ Location: {user.country}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Date & Time in Indian Format */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    color: 'white',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📅 <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{indianDate}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🕐 <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{indianTime}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{
                        ...styles.noDataContainer,
                        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                        border: '2px solid #bbf7d0',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛡️</div>
                        <h3 style={{ color: '#15803d', marginBottom: '12px', fontSize: '24px' }}>All Clear!</h3>
                        <p style={{ color: '#166534', fontSize: '16px', marginBottom: '20px' }}>
                            No suspicious activities detected. Your attendance system is secure.
                        </p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '16px',
                            marginTop: '24px'
                        }}>
                            <div style={{
                                background: 'white',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid #bbf7d0'
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📹</div>
                                <div style={{ fontWeight: '600', color: '#15803d' }}>Camera Monitoring</div>
                                <div style={{ fontSize: '12px', color: '#166534' }}>Active & Secure</div>
                            </div>
                            <div style={{
                                background: 'white',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid #bbf7d0'
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
                                <div style={{ fontWeight: '600', color: '#15803d' }}>VPN Detection</div>
                                <div style={{ fontSize: '12px', color: '#166534' }}>Operational</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuspiciousActivity;