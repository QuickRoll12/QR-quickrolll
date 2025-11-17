import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/global.css';
import '../styles/login.css';
import '../styles/notifications.css';

const ForgotPassword = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState('email'); // 'email', 'verification', 'reset'
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('error');
  const [notificationMessage, setNotificationMessage] = useState('');
  const navigate = useNavigate();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [codeExpiresIn, setCodeExpiresIn] = useState(600); // 10 minutes in seconds

  // Function to show notifications
  const showNotificationMessage = (message, type = 'error') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [cooldownTime]);

  // Code expiry timer effect
  useEffect(() => {
    if (step === 'verification' && codeExpiresIn > 0) {
      const timer = setInterval(() => {
        setCodeExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setError('Verification code has expired. Please request a new one.');
            showNotificationMessage('Verification code has expired. Please request a new one.', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [step, codeExpiresIn]);

  useEffect(() => {
    // If email was passed via location state (from the password change required notification)
    if (location.state?.email) {
      setEmail(location.state.email);
      
      // If redirected from login due to passwordChangeRequired, automatically submit the form
      if (location.state?.passwordChangeRequired) {
        const submitEmailForm = async () => {
          setIsLoading(true);
          try {
            const response = await authAPI.forgotPassword(location.state.email);
            if (response.role === 'student') {
              setIsStudent(true);
              setStep('verification');
              setMessage(response.message);
              showNotificationMessage(response.message, 'info');
            } else if (response.role === 'faculty') {
              setSuccess(true);
              setMessage(response.message);
              showNotificationMessage(response.message, 'success');
              
              setTimeout(() => {
                navigate('/faculty-reset-password', { state: { email, userId: response.userId } });
              }, 2000);
            }
          } catch (err) {
            const errorMessage = err.message || 'Failed to process request';
            setError(errorMessage);
            showNotificationMessage(errorMessage, 'error');
          } finally {
            setIsLoading(false);
          }
        };
        
        submitEmailForm();
      }
    }
  }, [location.state]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authAPI.forgotPassword(email);
      
      // Check user role
      if (response.role === 'faculty') {
        // For faculty, set success and redirect
        setSuccess(true);
        setMessage(response.message);
        showNotificationMessage(response.message, 'success');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/faculty-reset-password', { state: { email, userId: response.userId } });
        }, 2000);
      } else if (response.role === 'student') {
        // For students, just move to verification step without setting success
        setIsStudent(true);
        setStep('verification');
        setMessage(response.message);
        showNotificationMessage(response.message, 'info');
        
        // Set cooldown timer if provided
        if (response.cooldownPeriod) {
          setCooldownTime(response.cooldownPeriod);
        }
        
        // Set code expiry time
        if (response.expiresIn) {
          setCodeExpiresIn(response.expiresIn);
        }
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to process request';
      setError(errorMessage);
      showNotificationMessage(errorMessage, 'error');
      
      // Handle specific error types
      if (err.cooldown && err.retryAfter) {
        setCooldownTime(err.retryAfter);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      showNotificationMessage('Please enter a valid 6-digit verification code', 'error');
      setIsLoading(false);
      return;
    }
    
    try {
      // Validate the verification code before proceeding
      const response = await authAPI.verifyCode({
        email,
        code: verificationCode
      });
      
      // If verification is successful, move to password reset step
      showNotificationMessage('Verification code is valid', 'success');
      
      // Update remaining attempts if provided
      if (response.remainingAttempts !== undefined) {
        setRemainingAttempts(response.remainingAttempts);
      }
      
      setStep('reset');
    } catch (err) {
      const errorMessage = err.message || 'Invalid verification code';
      setError(errorMessage);
      showNotificationMessage(errorMessage, 'error');
      
      // Handle attempts exceeded
      if (err.attemptsExceeded) {
        setStep('email');
        setVerificationCode('');
        setRemainingAttempts(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Validate passwords
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      showNotificationMessage('Password must be at least 6 characters', 'error');
      setIsLoading(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      showNotificationMessage('Passwords do not match', 'error');
      setIsLoading(false);
      return;
    }
    
    try {
      // For students, we send the verification code
      const response = await authAPI.resetPassword({
        email,
        code: verificationCode,
        newPassword
      });
      
      setSuccess(true);
      setMessage('Password reset successful! You can now login with your new password.');
      
      // Redirect to login after successful reset
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const errorMessage = err.message || 'Failed to reset password';
      setError(errorMessage);
      showNotificationMessage(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <p className="auth-description">
        Enter your email address and we'll help you reset your password.
      </p>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      <form onSubmit={handleEmailSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
            placeholder="Enter your email"
          />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Continue'}
        </button>
        
        <div className="auth-links">
          <p>
            Remember your password? <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </form>
    </>
  );

  const renderVerificationStep = () => {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <>
        <p className="auth-description">
          We've sent a 6-digit verification code to your email. Please enter it below.
        </p>
        
        {/* Code Expiry Timer */}
        {codeExpiresIn > 0 && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: codeExpiresIn < 120 ? '#fff3cd' : '#d1ecf1', 
            border: `1px solid ${codeExpiresIn < 120 ? '#ffc107' : '#0dcaf0'}`,
            borderRadius: '5px', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            <small style={{ color: codeExpiresIn < 120 ? '#856404' : '#055160' }}>
              ⏱️ Code expires in: <strong>{formatTime(codeExpiresIn)}</strong>
            </small>
          </div>
        )}
        
        {/* Remaining Attempts Indicator */}
        {remainingAttempts !== null && remainingAttempts < 5 && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: remainingAttempts <= 2 ? '#f8d7da' : '#fff3cd',
            border: `1px solid ${remainingAttempts <= 2 ? '#f5c2c7' : '#ffc107'}`,
            borderRadius: '5px', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            <small style={{ color: remainingAttempts <= 2 ? '#842029' : '#856404' }}>
              ⚠️ {remainingAttempts} verification attempt{remainingAttempts !== 1 ? 's' : ''} remaining
            </small>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleVerificationSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="verificationCode">Verification Code</label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              required
              className="form-input"
              placeholder="Enter 6-digit code"
              maxLength={6}
              disabled={codeExpiresIn === 0}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={isLoading || verificationCode.length !== 6 || codeExpiresIn === 0}>
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
          
          <div className="auth-links">
            <p>
              {cooldownTime > 0 ? (
                <span style={{ color: '#6c757d' }}>
                  Request new code in {formatTime(cooldownTime)}
                </span>
              ) : (
                <Link to="#" onClick={(e) => { 
                  e.preventDefault(); 
                  setStep('email'); 
                  setVerificationCode('');
                  setRemainingAttempts(null);
                  setCodeExpiresIn(600);
                }}>Request New Code</Link>
              )}
            </p>
            <p>
              <Link to="#" onClick={(e) => { e.preventDefault(); setStep('email'); }}>Back to Email</Link>
            </p>
          </div>
        </form>
      </>
    );
  };

  const renderResetStep = () => (
    <>
      <p className="auth-description">
        Create a new password for your account.
      </p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handlePasswordReset} className="auth-form">
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNewPassword ? "text" : "password"}
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="form-input"
              placeholder="Enter new password"
              minLength={6}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="form-input"
              placeholder="Confirm new password"
              minLength={6}
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
        
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>
    </>
  );

  const renderSuccessMessage = () => (
    <div className="success-container">
      <div className="success-icon">✓</div>
      <p className="success-message">{message}</p>
      <p>Redirecting to login page...</p>
    </div>
  );

  return (
    <div className="container">
      {showNotification && (
        <div className={`notification-popup ${notificationType}`}>
          <div className="notification-icon">
            <i className={`fas ${notificationType === 'success' ? 'fa-check-circle' : notificationType === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'}`}></i>
          </div>
          <div className="notification-content">
            <p>{notificationMessage}</p>
          </div>
          <button 
            className="notification-close"
            onClick={() => setShowNotification(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      
      <div className="auth-container">
        <div className="auth-card">
          <h2>
            {step === 'email' ? 'Forgot Password' : 
             step === 'verification' ? 'Verify Code' : 
             'Reset Password'}
          </h2>
          
          {success ? renderSuccessMessage() : 
           step === 'email' ? renderEmailStep() :
           step === 'verification' ? renderVerificationStep() :
           renderResetStep()}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;