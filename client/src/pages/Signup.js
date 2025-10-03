import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/login.css';
import '../styles/notifications.css';

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('error');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    course: '',
    section: '',
    semester: '',
    classRollNumber: '',
    universityRollNumber: '',
  });

  // Email validation function - only checking for valid email format
  const validateEmail = (email) => {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Handle email change with validation
  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({ ...formData, email });
    setEmailError(validateEmail(email));
  };

  // Course options
  const courses = ['BTech', 'BCA', 'BCom', 'BBA', 'Law', 'MCA', 'MBA', 'BPharm','BSc']; // we will add more courses here
  const sections = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2','D1','D2','E1','E2','F1','F2','G1','G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2', 'K1', 'K2', 'L1', 'L2','ML1','ML2','ML3','DS1','DS2','Placement Group 1', 'Placement Group 2', 'Placement Group 3', 'Placement Group 4', 'Placement Group 5'];
  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowNotification(false);

    // Validate email before submission
    const emailValidationError = validateEmail(formData.email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setShowNotification(true);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setShowNotification(true);
      return;
    }

    // Check if semester is selected
    if (!formData.semester) {
      setError('Please select a semester');
      setShowNotification(true);
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    setShowNotification(false);
    
    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'student',
        studentId: formData.studentId,
        course: formData.course,
        section: formData.section,
        semester: formData.semester,
        classRollNumber: formData.classRollNumber,
        universityRollNumber: formData.universityRollNumber,
      };

      console.log('Registration Data:', registrationData);

      await authAPI.register(registrationData);
      alert('Please check your email to verify your account');
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      let errorMessage = 'Registration failed';
      
      // Extract error message from response if available
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setShowNotification(true);
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Student Registration</h1>
          <p>Create your student account</p>
        </div>

        {showNotification && error && (
          <div className={`notification-popup ${notificationType}`}>
            <div className="notification-icon">
              <i className={`fas ${notificationType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            </div>
            <div className="notification-content">
              <p>{error}</p>
            </div>
            <button 
              className="notification-close"
              onClick={() => setShowNotification(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Full Name"
              required
            />
            <i className="fas fa-user input-icon"></i>
          </div>

          <div className="form-group">
            <input
              type="email"
              value={formData.email}
              onChange={handleEmailChange}
              placeholder="Email Address"
              required
              className={emailError ? 'input-error' : ''}
            />
            <i className="fas fa-envelope input-icon"></i>
            {emailError && <div className="error-text">{emailError}</div>}
          </div>

          <div className="form-group">
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              placeholder="Student ID"
              required
            />
            <i className="fas fa-id-card input-icon"></i>
          </div>

          <div className="form-group">
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Password (min. 6 characters)"
              required
            />
            <i className="fas fa-lock input-icon"></i>
            <i 
              className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
              onClick={() => setShowPassword(!showPassword)}
            ></i>
          </div>

          <div className="form-group">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Confirm Password"
              required
            />
            <i className="fas fa-lock input-icon"></i>
            <i 
              className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            ></i>
          </div>

          <div className="form-group">
            <select
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              required
              className="custom-select"
            >
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <select
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              required
              className="custom-select"
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              required
              className="custom-select"
            >
              <option value="">Select Semester</option>
              {semesters.map((semester) => (
                <option key={semester} value={semester}>Semester {semester}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <input
              type="text"
              value={formData.classRollNumber}
              onChange={(e) => setFormData({ ...formData, classRollNumber: e.target.value })}
              placeholder="Class Roll Number"
              required
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              value={formData.universityRollNumber}
              onChange={(e) => setFormData({ ...formData, universityRollNumber: e.target.value })}
              placeholder="University Roll Number"
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-btn" 
            disabled={loading || emailError}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <div className="switch-form">
            Already have an account? <Link to="/login">Login here</Link>
          </div>
        </form>
      </div>

      {showConfirmation && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">⚠️ Please Confirm</h3>
            <p className="modal-text">
              Please recheck your details carefully. You cannot update these details once submitted!
            </p>
            <div className="modal-buttons">
              <button 
                onClick={() => setShowConfirmation(false)} 
                className="cancel-button"
              >
                Go Back & Edit
              </button>
              <button 
                onClick={handleConfirm} 
                className="confirm-button"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;