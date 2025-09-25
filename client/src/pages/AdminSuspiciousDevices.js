import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/AdminSuspiciousDevices.css';

const AdminSuspiciousDevices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuspiciousDevices();
  }, []);

  const fetchSuspiciousDevices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/suspicious-devices`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setDevices(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching suspicious devices:', error);
      setError('Failed to fetch suspicious devices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="suspicious-devices-container">
      <div className="admin-header">
        <h2>Suspicious Devices</h2>
        <button 
          className="back-button" 
          onClick={() => navigate('/admin/dashboard')}
        >
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i> Loading...
        </div>
      ) : devices.length === 0 ? (
        <div className="no-data">
          <i className="fas fa-check-circle"></i>
          <p>No suspicious devices detected</p>
        </div>
      ) : (
        <div className="devices-grid">
          {devices.map((device, index) => (
            <div key={index} className="device-card">
              <div className="device-header">
                <h3>{device.name}</h3>
                <span className={`device-count ${device.count > 3 ? 'high' : 'medium'}`}>
                  {device.count} logins
                </span>
              </div>
              
              <div className="device-details">
                <div className="detail-item">
                  <span className="detail-label">Course:</span>
                  <span className="detail-value">{device.course}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Section:</span>
                  <span className="detail-value">{device.section}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Roll Number:</span>
                  <span className="detail-value">{device.classRollNumber}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Seen:</span>
                  <span className="detail-value">{new Date(device.lastSeen).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="ip-addresses">
                <h4>IP Addresses:</h4>
                <div className="ip-list">
                  {device.ipAddresses.map((ip, ipIndex) => (
                    <span key={ipIndex} className="ip-badge">{ip}</span>
                  ))}
                </div>
              </div>
              
              {device.countries && device.countries.length > 0 && (
                <div className="countries">
                  <h4>Countries:</h4>
                  <div className="country-list">
                    {device.countries.map((country, countryIndex) => (
                      <span key={countryIndex} className="country-badge">
                        {country || 'Unknown'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSuspiciousDevices;