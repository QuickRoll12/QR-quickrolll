import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AdminLogin.css';

// Use environment variable directly instead of importing from config
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const AdminLogin = () => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if user is already logged in as admin
  useEffect(() => {
    // Clear any console to help with debugging
    console.clear();
    console.log('Admin login component mounted');
    
    // Check for token and user in localStorage
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Stored user found:', parsedUser);
        
        // We no longer auto-redirect if admin is found
        // This allows admins to log out and switch accounts
        if (parsedUser.role === 'admin') {
          console.log('Admin user detected, but not auto-redirecting');
          setError('You are already logged in as an admin. You can continue to the dashboard or log out to switch accounts.');
        } else if (parsedUser.role === 'faculty' || parsedUser.role === 'student') {
          console.log('Non-admin user detected');
          setError('You are currently logged in as a ' + parsedUser.role + '. Please log out first before accessing admin features.');
        }
      } catch (e) {
        console.error('Error parsing stored user:', e);
        // Invalid JSON in localStorage, remove it
        localStorage.removeItem('user');
      }
    } else {
      console.log('No admin user found in localStorage');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    
    if (!adminId || !password) {
      setError('Please enter both Admin ID and password');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Attempting to login with:', { adminId });
      
      // Make sure we're using the correct endpoint
      const loginUrl = `${BACKEND_URL}/api/admin/login`;
      console.log('Login URL:', loginUrl);
      
      const response = await axios.post(loginUrl, {
        adminId,
        password
      });
      
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        console.log('Login successful, token received');
        
        // Store the token
        localStorage.setItem('token', response.data.token);
        
        // Store admin user info with role
        const adminUser = {
          role: 'admin',
          name: 'Administrator',
          email: adminId
        };
        localStorage.setItem('user', JSON.stringify(adminUser));
        console.log('User data saved to localStorage');
        
        // Set auth header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      } else {
        console.error('Login response missing token:', response.data);
        setError('Login failed. Invalid response from server.');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setError('');
    window.location.reload(); // Reload the page to clear any cached state
  };

  // Function to go to admin dashboard
  const goToDashboard = () => {
    navigate('/admin/faculty-requests');
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h2>Admin Login</h2>
        <p className="admin-login-info">
          Please enter your admin credentials to access the admin dashboard.
        </p>
        
        {error && error.includes('already logged in as an admin') ? (
          <div>
            <div className="admin-info-message">{error}</div>
            <div className="admin-form-actions" style={{ marginTop: '20px' }}>
              <button 
                onClick={goToDashboard}
                className="admin-submit-button"
                style={{ marginRight: '10px' }}
              >
                Go to Dashboard
              </button>
              <button 
                onClick={handleLogout}
                className="admin-logout-button"
                style={{ backgroundColor: '#f44336' }}
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="admin-error-message">{error}</div>}
            
            <div className="admin-form-group">
              <label htmlFor="adminId">Admin ID</label>
              <input 
                id="adminId"
                type="text" 
                value={adminId} 
                onChange={(e) => setAdminId(e.target.value)} 
                required 
                placeholder="Enter Admin ID"
              />
            </div>
            
            <div className="admin-form-group">
              <label htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Enter password"
              />
            </div>
            
            <div className="admin-form-actions">
              <button 
                type="submit" 
                className="admin-submit-button" 
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
              {localStorage.getItem('user') && (
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="admin-logout-button"
                  style={{ backgroundColor: '#f44336', marginLeft: '10px' }}
                >
                  Logout First
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;