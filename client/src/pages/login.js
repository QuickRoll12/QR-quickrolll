import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Container, Paper } from '@mui/material';
import Logo from '../components/Logo';
import '../styles/login.css';
import '../styles/notifications.css';
import '../styles/login-background.css';
import ParticlesBackground from '../pages/particle.js';

const Login = () => {
  const navigate = useNavigate();
  const { login, resendVerification, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState('student'); // student or faculty
  const [errorMessage, setError] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('error');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPasswordChangeRequired, setShowPasswordChangeRequired] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showAppPopup, setShowAppPopup] = useState(true);

  // Set timer to auto-hide the app popup after 15 seconds
  useEffect(() => {
    if (showAppPopup) {
      const timer = setTimeout(() => {
        setShowAppPopup(false);
      }, 15000); // 15 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showAppPopup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowNotification(false);
    setShowVerificationMessage(false);
    setVerificationSent(false);
    setShowPasswordChangeRequired(false);
    
    try {
      // Login and get complete user profile
      const result = await login(credentials.identifier, credentials.password);
      
      // Check if email is verified
      if (result.isVerified === false) {
        setUnverifiedEmail(result.email);
        setShowVerificationMessage(true);
        setLoading(false);
        return;
      }
      
      // Check if password change is required
      if (result.passwordChangeRequired) {
        setUserEmail(credentials.email);
        setShowPasswordChangeRequired(true);
        setLoading(false);
        return;
      }
      
      const user = result.userData;
      
      // Check if user type matches their actual role
      if (userType === 'faculty' && user.role !== 'faculty') {
        throw new Error('Access denied. This login is for faculty only.');
      }
      
      if (userType === 'student' && user.role !== 'student') {
        throw new Error('Access denied. This login is for students only.');
      }

      // Verify required fields for students
      if (user.role === 'student' && (!user.course || !user.section || !user.classRollNumber)) {
        throw new Error('Your profile is missing required information. Please contact your administrator.');
      }

      // If validation passes, redirect to appropriate dashboard
      if (user.role === 'faculty') {
        navigate('/faculty');
      } else {
        navigate('/student');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid credentials or access denied');
      setShowNotification(true);
      setNotificationType('error');
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      await resendVerification(unverifiedEmail);
      setVerificationSent(true);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to resend verification email');
      setLoading(false);
    }
  };

  const handleContactAdmin = (e) => {
    e.preventDefault(); // Prevent any navigation
    const mailtoLink = `mailto:${process.env.REACT_APP_ADMIN_EMAIL}?subject=Faculty%20Account%20Request&body=Please%20provide%20the%20following%20details:%0A1.%20Name:%0A2.%20Department:%0A3.%20Email:%0A4.%20Contact%20Number:%0A5.%20Brief%20Message(Kindly attach your faculty ID Card):`;
    window.location.href = mailtoLink;
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    const mailtoLink = `mailto:${process.env.REACT_APP_ADMIN_EMAIL}?subject=Password%20Reset%20Request&body=Please%20provide%20the%20following%20details:%0A1.%20Name:%0A2.%20Role%20(Student/Faculty):%0A3.%20Email:%0A4.%20Department:%0A5.%20Brief%20Message:`;
    window.location.href = mailtoLink;
  };

  return (
    <>
      {/* Animated Background */}
      <div className="login-background">
        {/* Particles.js component */}
        <ParticlesBackground />
        {/* Original background elements */}
        <div className="network">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <canvas className="lines-canvas" id="connectingDotsCanvas"></canvas>
        </div>
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
        <div className="pulse-overlay"></div>
        <div className="overlay"></div>
      </div>
      
      <Container component="main" maxWidth="xs" className="login-container">
        {/* App Download Popup */}
        {showAppPopup && (
          <div className="app-download-popup">
            <div className="popup-content">
              <i className="fas fa-mobile-alt"></i>
              <div className="popup-text">
                <p><strong>Experience QuickRoll on the go!</strong> Mark attendance faster with our new Android app.</p>
              </div>
              <div className="popup-actions">
                <a href="https://www.mediafire.com/file/f5nzyiid80dh75t/Quick_Roll.apk/file" className="download-btn" target="_blank" rel="noopener noreferrer">
                  Download Now
                </a>
                <button className="close-popup" onClick={() => setShowAppPopup(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        )}
        
        <Paper elevation={3} className="login-card">
          <div className="login-header">
            <Logo />
            <h2>Welcome Back!</h2>
            <p>Please login to your account</p>
          </div>

        {showNotification && (
          <div className={`notification-popup ${notificationType}`}>
            <div className="notification-icon">
              <i className={`fas ${notificationType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            </div>
            <div className="notification-content">
              <p>{errorMessage}</p>
            </div>
            <button 
              className="notification-close"
              onClick={() => setShowNotification(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {showPasswordChangeRequired ? (
          <div className="verification-message">
            <div className="warning-message">
              <i className="fas fa-exclamation-circle"></i>
              <h3>Password Change Required</h3>
              <p>For security reasons, you need to change your password before accessing your account.</p>
              <button 
                className="login-btn"
                onClick={() => navigate('/forgot-password', { state: { email: userEmail, passwordChangeRequired: true } })}
              >
                Change Password
              </button>
              <button 
                className="secondary-btn"
                onClick={() => {
                  setShowPasswordChangeRequired(false);
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : showVerificationMessage ? (
          <div className="verification-message">
            <div className={`message ${verificationSent ? "success-message" : "warning-message"}`}>
              {verificationSent ? (
                <>
                  <i className="fas fa-check-circle"></i>
                  <h3>Verification Email Sent!</h3>
                  <p>A new verification email has been sent to <strong>{unverifiedEmail}</strong>. Please check your inbox and follow the instructions to verify your account.</p>
                  <button 
                    className="login-btn"
                    onClick={() => {
                      setShowVerificationMessage(false);
                      setVerificationSent(false);
                    }}
                  >
                    Back to Login
                  </button>
                </>
              ) : (
                <>
                  <i className="fas fa-exclamation-triangle"></i>
                  <h3>Email Not Verified</h3>
                  <p>Your email <strong>{unverifiedEmail}</strong> has not been verified yet. Please check your inbox for the verification email.</p>
                  <p>Didn't receive the email?</p>
                  <button 
                    className="login-btn"
                    onClick={handleResendVerification}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="user-type-toggle">
              <button 
                className={`toggle-btn ${userType === 'student' ? 'active' : ''}`}
                onClick={() => setUserType('student')}
              >
                Student
              </button>
              <button 
                className={`toggle-btn ${userType === 'faculty' ? 'active' : ''}`}
                onClick={() => setUserType('faculty')}
              >
                Faculty
              </button>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              {userType === 'student' ? (
                <input 
                  type='text' 
                  value={credentials.identifier} 
                  onChange={(e) => setCredentials({...credentials, identifier: e.target.value})} 
                  placeholder="Student ID" 
                  required
                />
              ) : (
                <input 
                  type='email' 
                  value={credentials.identifier} 
                  onChange={(e) => setCredentials({...credentials, identifier: e.target.value})} 
                  placeholder="E-mail Address" 
                  required
                />
              )}
              <i className={`fas ${userType === 'student' ? 'fa-user' : 'fa-envelope'} input-icon`}></i>
            </div>

              <div className="form-group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  placeholder="Password"
                  required
                />
                <i className="fas fa-lock input-icon"></i>
                <i 
                  className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
                  onClick={() => setShowPassword(!showPassword)}
                ></i>
              </div>
              
              <button 
                type="submit" 
                className="login-btn" 
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <div className="auth-links">
                <p>
                  <Link to="/forgot-password">Forgot Password?</Link>
                </p>
              </div>

              <div className="switch-form">
                {userType === 'student' ? (
                  <>New user? <Link to="/">Creating Account is disabled !</Link></>
                ) : (
                  <>Need a faculty account? <Link to="/faculty-request">Request Faculty Account</Link></>
                )}
              </div>
            </form>
          </>
        )}
        </Paper>
      </Container>
    </>
  );
};

// Script to create connecting dots animation
const connectDots = () => {
  const canvas = document.getElementById('connectingDotsCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const dots = document.querySelectorAll('.dot');
  const dotsArray = Array.from(dots);
  
  // Set canvas size to match window size
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  
  // Initial resize
  resizeCanvas();
  
  // Resize on window resize
  window.addEventListener('resize', resizeCanvas);
  
  // Animation function
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // Draw connections between dots that are close enough
    for (let i = 0; i < dotsArray.length; i++) {
      const dot1 = dotsArray[i];
      const dot1Rect = dot1.getBoundingClientRect();
      const dot1X = dot1Rect.left + dot1Rect.width / 2;
      const dot1Y = dot1Rect.top + dot1Rect.height / 2;
      
      for (let j = i + 1; j < dotsArray.length; j++) {
        const dot2 = dotsArray[j];
        const dot2Rect = dot2.getBoundingClientRect();
        const dot2X = dot2Rect.left + dot2Rect.width / 2;
        const dot2Y = dot2Rect.top + dot2Rect.height / 2;
        
        // Calculate distance between dots
        const dx = dot1X - dot2X;
        const dy = dot1Y - dot2Y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only connect dots that are within a certain distance
        if (distance < 150) {
          // Opacity based on distance (closer = more opaque)
          const opacity = 1 - (distance / 150);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
          
          ctx.beginPath();
          ctx.moveTo(dot1X, dot1Y);
          ctx.lineTo(dot2X, dot2Y);
          ctx.stroke();
        }
      }
    }
    
    requestAnimationFrame(animate);
  };
  
  // Start animation
  animate();
};

// Run the animation when component mounts
if (typeof window !== 'undefined') {
  window.addEventListener('load', connectDots);
}

export default Login;