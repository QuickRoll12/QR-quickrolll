import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SuspiciousDevices = () => {
  const [suspiciousDevices, setSuspiciousDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
  
  useEffect(() => {
    const fetchSuspiciousDevices = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch suspicious devices');
        setLoading(false);
      }
    };

    fetchSuspiciousDevices();
  }, [BACKEND_URL, token]);

  // Format date for better readability
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="loading">Loading suspicious device data...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="suspicious-devices-container">
      <h2>Suspicious Device Activity</h2>
      <p className="info-text">
        This panel shows devices that have been used by multiple students, which may indicate proxy attendance.
      </p>
      
      {suspiciousDevices.length === 0 ? (
        <div className="no-data">No suspicious device activity detected</div>
      ) : (
        <div className="devices-list">
          {suspiciousDevices.map((device, index) => (
            <div key={index} className="device-card">
              <div className="device-header">
                <h3>Device #{index + 1}</h3>
                <span className="user-count">
                  Used by {device.userCount.length} different students
                </span>
              </div>
              
              <div className="device-details">
                <div className="detail-item">
                  <span className="label">Fingerprint:</span>
                  <span className="value">{device._id.substring(0, 8)}...</span>
                </div>
                
                <h4>Session History:</h4>
                <table className="sessions-table">
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
          ))}
        </div>
      )}
      
      <div className="help-section">
        <h3>How to interpret this data</h3>
        <ul>
          <li>Multiple students using the same device within a short time period may indicate proxy attendance</li>
          <li>Check the IP addresses to see if they changed between sessions (VPN usage)</li>
          <li>Review the timestamps to identify suspicious patterns</li>
        </ul>
      </div>
    </div>
  );
};

export default SuspiciousDevices;
