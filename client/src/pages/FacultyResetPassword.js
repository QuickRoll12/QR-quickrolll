import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/global.css';
import '../styles/login.css';

const FacultyResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userId: '',
    email: '',
    facultyId: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Get email and userId from location state if available
    if (location.state?.email && location.state?.userId) {
      setFormData(prev => ({
        ...prev,
        email: location.state.email,
        userId: location.state.userId
      }));
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.resetFacultyPassword({
        userId: formData.userId,
        email: formData.email,
        facultyId: formData.facultyId,
        newPassword: formData.newPassword
      });
      
      setSuccess(true);
      setMessage(response.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-container">
        <div className="auth-card reset-password-card">
          <h2>Faculty Password Reset</h2>
          
          {!success ? (
            <>
              <p className="auth-description">
                Please verify your identity and enter a new password.
              </p>
              
              {error && <div className="error-message">{error}</div>}
              {message && <div className="success-message">{message}</div>}
              
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter your email"
                    readOnly={!!location.state?.email}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="facultyId">Faculty ID</label>
                  <input
                    type="text"
                    id="facultyId"
                    name="facultyId"
                    value={formData.facultyId}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter your faculty ID"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      👁️
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      👁️
                    </button>
                  </div>
                </div>
                
                <div className="password-requirements">
                  <p>Password must:</p>
                  <ul>
                    <li className={formData.newPassword.length >= 6 ? 'met' : ''}>
                      Be at least 6 characters long
                    </li>
                    <li className={/[A-Z]/.test(formData.newPassword) ? 'met' : ''}>
                      Contain at least one uppercase letter
                    </li>
                    <li className={/[0-9]/.test(formData.newPassword) ? 'met' : ''}>
                      Contain at least one number
                    </li>
                  </ul>
                </div>
                
                <div className="form-buttons">
                  <Link to="/login" className="btn btn-secondary">Cancel</Link>
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Resetting Password...' : 'Reset Password'}
                  </button>
                </div>
                
                <div className="auth-links">
                  <p>
                    Remember your password? <Link to="/login">Back to Login</Link>
                  </p>
                </div>
              </form>
            </>
          ) : (
            <div className="success-container">
              <div className="success-icon">✓</div>
              <p className="success-message">{message}</p>
              <p className="redirect-text">Redirecting to login page...</p>
              <div className="loader-bar">
                <div className="loader-progress"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyResetPassword;