import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

// Import pages
import Login from './pages/login';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Signup from './pages/Signup.js';
import AboutUs from './pages/AboutUs';
import SuspiciousActivity from './pages/SuspiciousActivity';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FacultyResetPassword from './pages/FacultyResetPassword';
import FacultyRequestForm from './pages/FacultyRequestForm';
import AdminLogin from './pages/AdminLogin';
import AdminFacultyRequests from './pages/AdminFacultyRequests';
import AdminDataUpload from './pages/AdminDataUpload';
import AdminDashboard from './pages/AdminDashboard';
import AdminSuspiciousDevices from './pages/AdminSuspiciousDevices';
import AdminStudentRecords from './pages/AdminStudentRecords';
import AdminFacultyRecords from './pages/AdminFacultyRecords';
import FacultyPastAttendance from './pages/FacultyPastAttendance';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ChatPage from './pages/ChatPage';
import AdminChatbotContent from './pages/AdminChatbotContent';
import AdminManageFacultyAssignments from './pages/AdminManageFacultyAssignments';
import StudentAttendanceSummary from './pages/StudentAttendanceSummary';
import StudentAttendanceDetails from './pages/StudentAttendanceDetails';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import AccountDeletion from './pages/AccountDeletion';
import Chatbot from './components/Chatbot';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Check for admin in localStorage (for admin routes)
  const checkAdminInLocalStorage = () => {
    if (allowedRoles && allowedRoles.includes('admin')) {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role === 'admin') {
            return true;
          }
        }
      } catch (e) {
      }
    }
    return false;
  };
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="load">
        <div className="loader-container">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="loader">
                <g className="dash">
                  <path style={{"--sped": "4s"}} pathLength="360" d="M 31.9463 1 C 15.6331 1 2.2692 13.6936 1 29.8237 L 17.644 36.7682 C 19.0539 35.794 20.7587 35.2264 22.5909 35.2264 C 22.7563 35.2264 22.9194 35.231 23.0803 35.2399 L 30.4828 24.412 L 30.4828 24.2601 C 30.4828 17.7446 35.7359 12.4423 42.1933 12.4423 C 48.6507 12.4423 53.9038 17.7446 53.9038 24.2601 C 53.9038 30.7756 48.6507 36.08 42.1933 36.08 C 42.104 36.08 42.0168 36.0778 41.9275 36.0755 L 31.3699 43.6747 C 31.3766 43.8155 31.3811 43.9562 31.3811 44.0947 C 31.3811 48.9881 27.4374 52.9675 22.5909 52.9675 C 18.3367 52.9675 14.7773 49.902 13.9729 45.8443 L 2.068 40.8772 C 5.7548 54.0311 17.7312 63.6748 31.9463 63.6748 C 49.0976 63.6748 63 49.6428 63 32.3374 C 63 15.0297 49.0976 1 31.9463 1 Z" className="big"></path>
                  <path pathLength="360" d="M 20.4603 48.5493 L 16.6461 46.9584 C 17.3209 48.3794 18.4917 49.5682 20.0447 50.2206 C 23.4007 51.6328 27.2707 50.0262 28.6694 46.6367 C 29.3464 44.9966 29.3509 43.1867 28.6806 41.5422 C 28.0103 39.8977 26.7434 38.6151 25.119 37.9315 C 23.5035 37.2544 21.7741 37.279 20.2547 37.8576 L 24.1961 39.5022 C 26.6719 40.5434 27.8427 43.4124 26.8104 45.9105 C 25.7803 48.4085 22.936 49.5905 20.4603 48.5493 Z" className="aaa"></path>
                  <path pathLength="360" d="M 49.9968 24.2603 C 49.9968 19.9188 46.4954 16.384 42.1943 16.384 C 37.8908 16.384 34.3894 19.9188 34.3894 24.2603 C 34.3894 28.6017 37.8908 32.1343 42.1943 32.1343 C 46.4954 32.1343 49.9968 28.6017 49.9968 24.2603 Z"></path>
                  <path pathLength="360" d="M 36.3446 24.2469 C 36.3446 20.9802 38.97 18.3324 42.2054 18.3324 C 45.4431 18.3324 48.0685 20.9802 48.0685 24.2469 C 48.0685 27.5135 45.4431 30.1613 42.2054 30.1613 C 38.97 30.1613 36.3446 27.5135 36.3446 24.2469 Z"></path>
                </g>
                <path pathLength="360" d="M 31.9463 1 C 15.6331 1 2.2692 13.6936 1 29.8237 L 17.644 36.7682 C 19.0539 35.794 20.7587 35.2264 22.5909 35.2264 C 22.7563 35.2264 22.9194 35.231 23.0803 35.2399 L 30.4828 24.412 L 30.4828 24.2601 C 30.4828 17.7446 35.7359 12.4423 42.1933 12.4423 C 48.6507 12.4423 53.9038 17.7446 53.9038 24.2601 C 53.9038 30.7756 48.6507 36.08 42.1933 36.08 C 42.104 36.08 42.0168 36.0778 41.9275 36.0755 L 31.3699 43.6747 C 31.3766 43.8155 31.3811 43.9562 31.3811 44.0947 C 31.3811 48.9881 27.4374 52.9675 22.5909 52.9675 C 18.3367 52.9675 14.7773 49.902 13.9729 45.8443 L 2.068 40.8772 C 5.7548 54.0311 17.7312 63.6748 31.9463 63.6748 C 49.0976 63.6748 63 49.6428 63 32.3374 C 63 15.0297 49.0976 1 31.9463 1 Z" fill="#212121"></path>
                <path className="fill" pathLength="360" d="M 31.9463 1 C 15.6331 1 2.2692 13.6936 1 29.8237 L 17.644 36.7682 C 19.0539 35.794 20.7587 35.2264 22.5909 35.2264 C 22.7563 35.2264 22.9194 35.231 23.0803 35.2399 L 30.4828 24.412 L 30.4828 24.2601 C 30.4828 17.7446 35.7359 12.4423 42.1933 12.4423 C 48.6507 12.4423 53.9038 17.7446 53.9038 24.2601 C 53.9038 30.7756 48.6507 36.08 42.1933 36.08 C 42.104 36.08 42.0168 36.0778 41.9275 36.0755 L 31.3699 43.6747 C 31.3766 43.8155 31.3811 43.9562 31.3811 44.0947 C 31.3811 48.9881 27.4374 52.9675 22.5909 52.9675 C 18.3367 52.9675 14.7773 49.902 13.9729 45.8443 L 2.068 40.8772 C 5.7548 54.0311 17.7312 63.6748 31.9463 63.6748 C 49.0976 63.6748 63 49.6428 63 32.3374 C 63 15.0297 49.0976 1 31.9463 1 Z"></path>
            </svg>
        </div>
        <div className="loading-text">Loading your dashboard...</div>
    </div>
    );
  }
  
  // Check if this is an admin route and we have admin in localStorage
  const isAdminInLocalStorage = checkAdminInLocalStorage();
  
  // For admin routes, check localStorage first
  if (allowedRoles && allowedRoles.includes('admin')) {
    if (isAdminInLocalStorage) {
      return children;
    } else {
      return <Navigate to="/admin/login" replace />;
    }
  }
  
  // For non-admin routes, use regular auth check
  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Main App Component
function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);

  const handleLandingComplete = () => {
    setAnimationComplete(true);
    // After animation is complete, we can remove the landing page from the DOM
    setTimeout(() => {
      setShowLanding(false);
    }, 1000); // Allow time for the shutter animation to complete
  };

  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          {showLanding ? (
            <LandingAnimation onComplete={handleLandingComplete} />
          ) : (
            <div className="main-content">
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/account-deletion" element={<AccountDeletion />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/faculty-reset-password" element={<FacultyResetPassword />} />
                <Route path="/faculty-request" element={<FacultyRequestForm />} />
                <Route 
                  path="/faculty" 
                  element={
                    <ProtectedRoute allowedRoles={['faculty']}>
                      <FacultyDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/student" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/student/attendance/summary" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentAttendanceSummary />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/student/attendance/details/:facultyId" 
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentAttendanceDetails />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/suspicious-activity" 
                  element={
                    <ProtectedRoute allowedRoles={['faculty']}>
                      <SuspiciousActivity />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/suspicious-devices" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminSuspiciousDevices />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/faculty/past-attendance" 
                  element={
                    <ProtectedRoute allowedRoles={['faculty']}>
                      <FacultyPastAttendance />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route 
                  path="/admin/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/faculty-requests" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminFacultyRequests />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/upload-data" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDataUpload />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/chat" 
                  element={
                    <ProtectedRoute allowedRoles={['student', 'faculty']}>
                      <ChatPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/chatbot-content" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminChatbotContent />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/manage-faculty-assignments" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminManageFacultyAssignments />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/student-records" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminStudentRecords />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/faculty-records" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminFacultyRecords />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </div>
          )}
          <Footer />
          <Chatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

const LandingAnimation = ({ onComplete }) => {
  const [animationComplete, setAnimationComplete] = useState(false);
  const particlesRef = useRef(null);

  useEffect(() => {
    // After animation sequence, trigger the shutter effect
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // After shutter animation, notify parent component
    if (animationComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000); // Time for shutter to complete

      return () => clearTimeout(timer);
    }
  }, [animationComplete, onComplete]);

  // Generate random particles
  const particles = [];
  for (let i = 0; i < 40; i++) {
    particles.push({
      id: i,
      x: Math.random() * 1000 - 500,
      y: Math.random() * 1000 - 500,
      size: Math.random() * 15 + 3,
      color: `rgba(${Math.floor(Math.random() * 100) + 155}, ${Math.floor(Math.random() * 100) + 155}, 255, ${Math.random() * 0.5 + 0.5})`,
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 3
    });
  }

  return (
    <AnimatePresence>
      {!animationComplete ? (
        <LandingScreen
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.5 }
          }}
        >
          <LogoAnimation>
            <LogoContainer
              initial={{ scale: 0.8 }}
              animate={{ 
                scale: 1,
                transition: { 
                  duration: 0.8,
                  ease: [0.34, 1.56, 0.64, 1] // Spring-like bounce
                }
              }}
            >
              {/* Outer elements */}
              <LogoRing
                initial={{ rotate: 0, opacity: 0 }}
                animate={{ 
                  rotate: 360,
                  opacity: [0, 0.7, 0.7],
                  transition: { 
                    opacity: { times: [0, 0.3, 1], duration: 3 },
                    rotate: { duration: 15, ease: "linear", repeat: Infinity }
                  }
                }}
              />
              
              <LogoRing2
                initial={{ rotate: 0, opacity: 0 }}
                animate={{ 
                  rotate: -360,
                  opacity: [0, 0.7, 0.7],
                  transition: { 
                    opacity: { times: [0, 0.3, 1], duration: 3.5 },
                    rotate: { duration: 20, ease: "linear", repeat: Infinity }
                  }
                }}
              />
              
              {/* Main logo circle */}
              <LogoCircle 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  transition: { 
                    duration: 0.8,
                    ease: "easeOut"
                  } 
                }}
              >
                <CircleInner
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    transition: { 
                      delay: 0.4,
                      duration: 0.8,
                      ease: "easeOut"
                    } 
                  }}
                >
                  {/* Logo symbol with checkmark and clock */}
                  <LogoSymbol>
                    <CheckmarkPath 
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ 
                        pathLength: 1, 
                        opacity: 1,
                        transition: { 
                          delay: 0.6,
                          duration: 0.8,
                          ease: "easeOut"
                        } 
                      }}
                      d="M15,30 L25,40 L45,20"
                      stroke="#ffffff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <ClockFace>
                      <ClockHand
                        initial={{ rotate: 67, opacity: 0 }}
                        animate={{ 
                          rotate: 19,
                          opacity: 1,
                          transition: { 
                            delay: 1.2,
                            duration: 0.6,
                            ease: "easeOut"
                          } 
                        }}
                      />
                      <ClockCenter 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                          scale: 1,
                          opacity: 1,
                          transition: { delay: 1.2, duration: 0.3 }
                        }}
                      />
                    </ClockFace>
                  </LogoSymbol>
                </CircleInner>
              </LogoCircle>
              
              {/* Pulse effects */}
              <CorePulse
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: 1.2, 
                  opacity: [0, 0.5, 0],
                  transition: { 
                    delay: 2,
                    duration: 2,
                    ease: "easeOut",
                    repeat: Infinity
                  }
                }}
              />
              <CorePulse
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: 1.2, 
                  opacity: [0, 0.5, 0],
                  transition: { 
                    delay: 2.7,
                    duration: 2,
                    ease: "easeOut",
                    repeat: Infinity
                  }
                }}
              />
              <CorePulse
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: 1.2, 
                  opacity: [0, 0.5, 0],
                  transition: { 
                    delay: 3.4,
                    duration: 2,
                    ease: "easeOut",
                    repeat: Infinity
                  }
                }}
              />
            </LogoContainer>
            
            {/* Text elements */}
            <LogoText
              initial={{ y: 50, opacity: 0 }}
              animate={{ 
                y: 0, 
                opacity: 1,
                transition: { 
                  delay: 1.5, 
                  duration: 0.8, 
                  ease: "easeOut" 
                } 
              }}
            >
              <span className="q">Q</span>
              <span className="u">u</span>
              <span className="i">i</span>
              <span className="c">c</span>
              <span className="k">k</span>
              <span className="r">R</span>
              <span className="o">o</span>
              <span className="l1">l</span>
              <span className="l2">l</span>
            </LogoText>
            
            <Tagline
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                transition: { 
                  delay: 2.3, 
                  duration: 0.8 
                } 
              }}
            >
              Attendance Made Simple
            </Tagline>
            
            <FeaturesText
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                transition: { delay: 3.2, duration: 0.8 } 
              }}
            >
              <FeatureItem>
                <FeatureIcon>⚡</FeatureIcon>
                <FeatureLabel>Fast</FeatureLabel>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon>🔒</FeatureIcon>
                <FeatureLabel>Secure</FeatureLabel>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon>✓</FeatureIcon>
                <FeatureLabel>Reliable</FeatureLabel>
              </FeatureItem>
            </FeaturesText>
            
            {/* Background elements */}
            <Particles ref={particlesRef}>
              {particles.map((particle) => (
                <Particle 
                  key={particle.id}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 0,
                    scale: 0
                  }}
                  animate={{ 
                    x: particle.x, 
                    y: particle.y, 
                    opacity: particle.id % 3 === 0 ? [0, 1, 0] : 1,
                    scale: 1,
                    transition: { 
                      delay: particle.delay, 
                      duration: particle.duration, 
                      ease: "easeOut",
                      opacity: {
                        duration: particle.duration * 1.5,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }
                    } 
                  }}
                  style={{
                    width: particle.size + 'px',
                    height: particle.size + 'px',
                    background: particle.color
                  }}
                />
              ))}
            </Particles>
            
            <GridLines>
              {[...Array(20)].map((_, i) => (
                <GridLine 
                  key={i}
                  style={{
                    left: `${i * 5}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
              {[...Array(20)].map((_, i) => (
                <GridLine 
                  key={i + 20}
                  horizontal
                  style={{
                    top: `${i * 5}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </GridLines>
          </LogoAnimation>
        </LandingScreen>
      ) : (
        <ShutterContainer key="shutter">
          <ShutterTop 
            initial={{ height: '50vh' }}
            animate={{ 
              height: 0,
              transition: { 
                duration: 1.2, 
                ease: [0.43, 0.13, 0.23, 0.96] 
              } 
            }}
          >
            <ShutterLines>
              {[...Array(10)].map((_, i) => (
                <ShutterLine 
                  key={i}
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))}
            </ShutterLines>
          </ShutterTop>
          <ShutterBottom 
            initial={{ height: '50vh' }}
            animate={{ 
              height: 0,
              transition: { 
                duration: 1.2, 
                ease: [0.43, 0.13, 0.23, 0.96] 
              } 
            }}
          >
            <ShutterLines>
              {[...Array(10)].map((_, i) => (
                <ShutterLine 
                  key={i}
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))}
            </ShutterLines>
          </ShutterBottom>
        </ShutterContainer>
      )}
    </AnimatePresence>
  );
};

const LandingScreen = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  z-index: 1000;
  overflow: hidden;
`;

const LogoAnimation = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

const LogoContainer = styled(motion.div)`
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LogoRing = styled(motion.div)`
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid rgba(255, 255, 255, 0.9);
  border-left: 2px solid rgba(255, 255, 255, 0.7);
`;

const LogoRing2 = styled(motion.div)`
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 4px solid rgba(76, 201, 240, 0.3);
  border-bottom: 4px solid rgba(76, 201, 240, 0.9);
  border-right: 4px solid rgba(76, 201, 240, 0.7);
`;

const LogoCircle = styled(motion.div)`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
  position: relative;
`;

const CircleInner = styled(motion.div)`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4cc9f0, #4361ee);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const LogoSymbol = styled.div`
  width: 60px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const CheckmarkPath = styled(motion.path)`
  stroke: #ffffff;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
`;

const ClockFace = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ClockHand = styled(motion.div)`
  width: 4px;
  height: 40px;
  background: #ffffff;
  border-radius: 2px;
  position: absolute;
  top: 15%;
  left: 34%;
  transform-origin: bottom center;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
`;

const ClockCenter = styled(motion.div)`
  width: 8px;
  height: 8px;
  background: #ffffff;
  border-radius: 50%;
  position: absolute;
  top: 45%;
  left: 40%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
`;

const CorePulse = styled(motion.div)`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(76, 201, 240, 0.3);
`;

const LogoText = styled(motion.h1)`
  font-size: 4rem;
  font-weight: 700;
  color: white;
  margin-top: 30px;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  letter-spacing: 2px;
  
  span {
    display: inline-block;
    transform-origin: bottom;
  }
  
  .q { animation: wave 2s ease-in-out 1.5s 1; }
  .u { animation: wave 2s ease-in-out 1.6s 1; }
  .i { animation: wave 2s ease-in-out 1.7s 1; }
  .c { animation: wave 2s ease-in-out 1.8s 1; }
  .k { animation: wave 2s ease-in-out 1.9s 1; }
  .r { animation: wave 2s ease-in-out 2.0s 1; }
  .o { animation: wave 2s ease-in-out 2.1s 1; }
  .l1 { animation: wave 2s ease-in-out 2.2s 1; }
  .l2 { animation: wave 2s ease-in-out 2.3s 1; }
  
  @keyframes wave {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }
`;

const Tagline = styled(motion.p)`
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 15px;
  font-weight: 300;
  letter-spacing: 1px;
`;

const FeaturesText = styled(motion.div)`
  font-size: 1.5rem;
  color: white;
  margin-top: 20px;
  font-weight: 400;
  letter-spacing: 1px;
  text-align: center;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0;
`;

const FeatureIcon = styled.span`
  font-size: 1.5rem;
  margin-right: 10px;
`;

const FeatureLabel = styled.span`
  font-size: 1.2rem;
`;

const Particles = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
`;

const Particle = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
`;

const GridLines = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
  opacity: 0.15;
`;

const GridLine = styled.div`
  position: absolute;
  background: rgba(255, 255, 255, 0.5);
  ${props => props.horizontal ? 'width: 100%; height: 1px;' : 'height: 100%; width: 1px;'}
  transform: ${props => props.horizontal ? 'scaleX(0)' : 'scaleY(0)'};
  transform-origin: ${props => props.horizontal ? 'left' : 'top'};
  animation: ${props => props.horizontal ? 'expandHorizontal' : 'expandVertical'} 3s forwards;
  
  @keyframes expandHorizontal {
    to { transform: scaleX(1); }
  }
  
  @keyframes expandVertical {
    to { transform: scaleY(1); }
  }
`;

const ShutterContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 900;
  overflow: hidden;
`;

const ShutterTop = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  z-index: 900;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  overflow: hidden;
`;

const ShutterBottom = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: linear-gradient(135deg, #4361ee, #3a0ca3);
  z-index: 900;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: hidden;
`;

const ShutterLines = styled.div`
  width: 100%;
  height: 20px;
  display: flex;
  justify-content: space-around;
`;

const ShutterLine = styled.div`
  width: 8%;
  height: 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 2px;
  animation: pulse 1s infinite alternate;
  
  @keyframes pulse {
    from { opacity: 0.3; }
    to { opacity: 1; }
  }
`;

export default App;