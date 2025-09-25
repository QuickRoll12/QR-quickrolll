import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const DeviceMonitoring = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [suspiciousDevices, setSuspiciousDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'faculty')) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchSuspiciousDevices = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${BACKEND_URL}/api/admin/suspicious-devices`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        setSuspiciousDevices(data);
      } catch (err) {
        console.error('Failed to fetch suspicious devices:', err);
        setError(err.message || 'Failed to fetch suspicious devices');
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.role === 'faculty') {
      fetchSuspiciousDevices();
    }
  }, [user]);

  // Format date for better readability
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading || isLoading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Device Monitoring</h1>
        <div style={styles.loadingContainer}>Loading suspicious device data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Device Monitoring</h1>
      
      {error && <div style={styles.error}>{error}</div>}
      
      <div style={styles.infoBox}>
        <h3>About Device Monitoring</h3>
        <p>This page shows devices that have been used by multiple students, which may indicate proxy attendance.</p>
        <p>The system tracks device fingerprints, WebRTC IPs, and regular IP addresses to detect when the same device is used by different students.</p>
      </div>
      
      {suspiciousDevices.length === 0 ? (
        <div style={styles.noData}>
          <h3>No suspicious device activity detected</h3>
          <p>All devices are currently being used by single students only.</p>
        </div>
      ) : (
        <div style={styles.devicesList}>
          <h2>Suspicious Devices ({suspiciousDevices.length})</h2>
          
          {suspiciousDevices.map((device, index) => (
            <div key={index} style={styles.deviceCard}>
              <div style={styles.deviceHeader}>
                <h3>Device #{index + 1}</h3>
                <span style={styles.userCount}>
                  Used by {device.userCount.length} different students
                </span>
              </div>
              
              <div style={styles.deviceDetails}>
                <div style={styles.detailItem}>
                  <span style={styles.label}>Fingerprint:</span>
                  <span style={styles.value}>{device._id.substring(0, 12)}...</span>
                </div>
                
                <h4>Session History:</h4>
                <div style={styles.tableContainer}>
                  <table style={styles.sessionsTable}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>IP Address</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {device.sessions.map((session, idx) => (
                        <tr key={idx}>
                          <td>{session.lastUserName}</td>
                          <td>{session.ipAddress}</td>
                          <td>{formatDate(session.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={styles.helpSection}>
        <h3>How to interpret this data</h3>
        <ul>
          <li>Multiple students using the same device within a short time period may indicate proxy attendance</li>
          <li>Check the IP addresses to see if they changed between sessions (VPN usage)</li>
          <li>Review the timestamps to identify suspicious patterns</li>
          <li>Students with legitimate reasons (shared lab computers) should be verified separately</li>
        </ul>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    color: '#333',
    borderBottom: '2px solid #4285f4',
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px 15px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  infoBox: {
    backgroundColor: '#e8f5e9',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '25px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  noData: {
    textAlign: 'center',
    padding: '30px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  devicesList: {
    marginBottom: '30px',
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  deviceHeader: {
    backgroundColor: '#4285f4',
    color: 'white',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userCount: {
    backgroundColor: '#fff',
    color: '#d32f2f',
    padding: '5px 10px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  deviceDetails: {
    padding: '20px',
  },
  detailItem: {
    marginBottom: '10px',
  },
  label: {
    fontWeight: 'bold',
    marginRight: '10px',
  },
  value: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: '3px 6px',
    borderRadius: '4px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  sessionsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
  },
  helpSection: {
    backgroundColor: '#e3f2fd',
    padding: '15px 20px',
    borderRadius: '8px',
    marginTop: '20px',
  },
};

export default DeviceMonitoring;
