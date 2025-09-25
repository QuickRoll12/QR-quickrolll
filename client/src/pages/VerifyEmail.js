import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/global.css';

const VerifyEmail = () => {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const [email, setEmail] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { resendVerification } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const urlStatus = params.get('status');
    const urlMessage = params.get('message');

    // If we have status and message from URL (redirected from backend)
    if (urlStatus && urlMessage) {
      setStatus(urlStatus);
      setMessage(decodeURIComponent(urlMessage));
      
      if (urlStatus === 'success') {
        // Redirect to login after 5 seconds on success
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      }
      return;
    }

    // If we have a token, verify it directly from frontend
    if (token) {
      const verifyEmail = async () => {
        try {
          const response = await authAPI.verifyEmail(token);
          setStatus('success');
          setMessage(response.message || 'Email verified successfully! You can now login.');
          setTimeout(() => {
            navigate('/login');
          }, 5000);
        } catch (error) {
          setStatus('error');
          setMessage(error.message || 'Failed to verify email. The link may be expired or invalid.');
        }
      };

      verifyEmail();
    } else if (!urlStatus) {
      // No token and no status means invalid access
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
    }
  }, [location.search, navigate]);

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }

    try {
      setStatus('resending');
      setMessage('Sending verification email...');
      await resendVerification(email);
      setStatus('resent');
      setMessage('Verification email sent successfully! Please check your inbox.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Failed to resend verification email.');
    }
  };

  return (
    <div className="container">
      <div className="auth-container">
        <div className="auth-card">
          <h2>Email Verification</h2>
          
          {status === 'verifying' && (
            <div className="verification-status">
              <div className="spinner"></div>
              <p>{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="verification-status success">
              <div className="success-icon">✓</div>
              <p>{message}</p>
              <p>Redirecting to login page...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="verification-status error">
              <div className="error-icon">!</div>
              <p>{message}</p>
              <div className="resend-form">
                <p>Need a new verification link?</p>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
                <button 
                  onClick={handleResendVerification}
                  className="btn btn-primary"
                >
                  Resend Verification Email
                </button>
              </div>
            </div>
          )}

          {status === 'resending' && (
            <div className="verification-status">
              <div className="spinner"></div>
              <p>{message}</p>
            </div>
          )}

          {status === 'resent' && (
            <div className="verification-status success">
              <div className="success-icon">✓</div>
              <p>{message}</p>
              <button 
                onClick={() => navigate('/login')}
                className="btn btn-primary"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;