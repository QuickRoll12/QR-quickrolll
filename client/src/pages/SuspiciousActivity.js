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
                const response = await axios.get(`${BACKEND_URL}/api/suspicious-activity`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Suspicious activity response:', response.data);
                setSuspiciousUsers(response.data);
            } catch (err) {
                console.error('Error fetching suspicious activity:', err);
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
                    suspiciousUsers.map((user, index) => (
                        <div key={index} style={styles.card}>
                            <div style={styles.cardTitle}>
                                <span>⚠️ Suspicious Activity</span>
                                <span style={styles.badge}>Alert</span>
                            </div>
                            <div style={styles.cardInfo}>
                                <span style={styles.label}>Name:</span>
                                <span>{user.name}</span>
                            </div>
                            <div style={styles.cardInfo}>
                                <span style={styles.label}>Course:</span>
                                <span>{user.course}</span>
                            </div>
                            <div style={styles.cardInfo}>
                                <span style={styles.label}>Section:</span>
                                <span>{user.section}</span>
                            </div>
                            <div style={styles.cardInfo}>
                                <span style={styles.label}>Roll Number:</span>
                                <span>{user.classRollNumber}</span>
                            </div>
                            <div style={styles.cardInfo}>
                                <span style={styles.label}>IP Address:</span>
                                <span>{user.ipAddress}</span>
                            </div>
                            <div style={styles.cardInfo}>
                                <span style={styles.label}>Country:</span>
                                <span>{user.country}</span>
                            </div>
                            <div style={styles.timestamp}>
        Detected: {formattedDate.replace(',', ' -')}
    </div>
                        </div>
                    ))
                ) : (
                    <div style={styles.noDataContainer}>
                        <h3>No Suspicious Activity Detected</h3>
                        <p>The system has not detected any suspicious behavior at this time.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuspiciousActivity;