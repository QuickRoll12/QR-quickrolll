import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/global.css';
import '../styles/login.css';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userId: '',
    email: '',
    studentId: '',
    course: '',
    section: '',
    classRollNumber: '',
    universityRollNumber: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Course and section options
  const courses = ['BTech', 'BCA', 'BCom', 'BBA', 'Law', 'MCA', 'MBA', 'BPharm', 'BSc'];
  const sections = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2', 'K1', 'K2', 'L1', 'L2','ML1','ML2','ML3','DS1','DS2','A1 ML1','B1 C1','CS1 DS1 D1 D2','ML2 ML3','A2 E1 E2','B2 C2 F1 F2 G1','E1 E2 F1 F2','Placement Group 1', 'Placement Group 2', 'Placement Group 3', 'Placement Group 4', 'Placement Group 5'];

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
      const response = await authAPI.resetPassword({
        userId: formData.userId,
        email: formData.email,
        studentId: formData.studentId,
        course: formData.course,
        section: formData.section,
        classRollNumber: formData.classRollNumber,
        universityRollNumber: formData.universityRollNumber,
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
        <div className="auth-card">
          <h2>Reset Password</h2>
          
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
                  <label htmlFor="studentId">Student ID</label>
                  <input
                    type="text"
                    id="studentId"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter your student ID"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="course">Course</label>
                  <select
                    id="course"
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    required
                    className="form-input"
                  >
                    <option value="">Select your course</option>
                    {courses.map((course, index) => (
                      <option key={index} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="section">Section</label>
                  <select
                    id="section"
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    required
                    className="form-input"
                  >
                    <option value="">Select your section</option>
                    {sections.map((section, index) => (
                      <option key={index} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="classRollNumber">Class Roll Number</label>
                  <input
                    type="text"
                    id="classRollNumber"
                    name="classRollNumber"
                    value={formData.classRollNumber}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter your class roll number"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="universityRollNumber">University Roll Number</label>
                  <input
                    type="text"
                    id="universityRollNumber"
                    name="universityRollNumber"
                    value={formData.universityRollNumber}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter your university roll number"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Confirm new password"
                  />
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </button>
                
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
              <p>Redirecting to login page...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;