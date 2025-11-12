import React, { useState } from 'react';
import '../styles/AccountDeletion.css';

const AccountDeletion = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    reason: '',
    additionalInfo: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create email content
    const emailSubject = encodeURIComponent('Account Deletion Request - QuickRoll');
    const emailBody = encodeURIComponent(`
Account Deletion Request

Name: ${formData.name}
Email: ${formData.email}
Student ID: ${formData.studentId}
Reason for Deletion: ${formData.reason}
Additional Information: ${formData.additionalInfo}

Please process my account deletion request as per your privacy policy.

Thank you.
    `);

    // Open email client
    window.location.href = `mailto:quickrollattendance@gmail.com?subject=${emailSubject}&body=${emailBody}`;
    
    setIsSubmitted(true);
  };

  return (
    <div className="account-deletion-container">
      {/* Header Section */}
      <div className="deletion-header">
        <div className="deletion-header-content">
          <div className="header-icon">
            <i className="fas fa-user-slash"></i>
          </div>
          <h1 className="deletion-title">Account Deletion Request</h1>
          <p className="deletion-subtitle">
            We respect your right to delete your personal data. Follow the process below to request account deletion.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="deletion-content">
        <div className="deletion-container-inner">
          
          {/* Process Overview */}
          <div className="process-overview">
            <h2>🔄 Deletion Process</h2>
            <div className="process-steps">
              <div className="process-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Submit Request</h3>
                  <p>Fill out the form below or email us directly at quickrollattendance@gmail.com</p>
                </div>
              </div>
              <div className="process-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Identity Verification</h3>
                  <p>We'll verify your identity to ensure account security (typically within 24 hours)</p>
                </div>
              </div>
              <div className="process-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Data Deletion</h3>
                  <p>Your account and associated data will be permanently deleted within 48 hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="trust-section">
            <h2>🛡️ Your Data Protection Rights</h2>
            <div className="trust-grid">
              <div className="trust-item">
                <div className="trust-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="trust-content">
                  <h3>48-Hour Processing</h3>
                  <p>We guarantee to process your deletion request within 48 hours of verification</p>
                </div>
              </div>
              <div className="trust-item">
                <div className="trust-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="trust-content">
                  <h3>Complete Removal</h3>
                  <p>All your personal data, attendance records, and account information will be permanently deleted</p>
                </div>
              </div>
              <div className="trust-item">
                <div className="trust-icon">
                  <i className="fas fa-certificate"></i>
                </div>
                <div className="trust-content">
                  <h3>GDPR Compliant</h3>
                  <p>Our deletion process meets all international data protection standards</p>
                </div>
              </div>
              <div className="trust-item">
                <div className="trust-icon">
                  <i className="fas fa-envelope-open-text"></i>
                </div>
                <div className="trust-content">
                  <h3>Confirmation Email</h3>
                  <p>You'll receive confirmation once your account has been successfully deleted</p>
                </div>
              </div>
            </div>
          </div>

          {/* Deletion Form */}
          {!isSubmitted ? (
            <div className="deletion-form-section">
              <div className="form-container">
                <h2>📝 Account Deletion Request Form</h2>
                <p>Please fill out this form to initiate your account deletion request. All fields are required for verification purposes.</p>
                
                <form onSubmit={handleSubmit} className="deletion-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">Full Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Enter your full name as registered"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email">Registered Email Address *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="Enter your registered email"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="studentId">Student ID / Faculty ID *</label>
                    <input
                      type="text"
                      id="studentId"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      required
                      placeholder="Enter your Student ID or Faculty ID"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reason">Reason for Account Deletion *</label>
                    <select
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a reason</option>
                      <option value="no-longer-needed">No longer need the service</option>
                      <option value="privacy-concerns">Privacy concerns</option>
                      <option value="switching-institutions">Switching institutions</option>
                      <option value="graduation">Graduation/Course completion</option>
                      <option value="technical-issues">Technical issues</option>
                      <option value="other">Other (please specify below)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="additionalInfo">Additional Information</label>
                    <textarea
                      id="additionalInfo"
                      name="additionalInfo"
                      value={formData.additionalInfo}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Any additional information or specific requests regarding your account deletion..."
                    ></textarea>
                  </div>

                  <div className="important-notice">
                    <div className="notice-icon">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div className="notice-content">
                      <h3>⚠️ Important Notice</h3>
                      <p>
                        Account deletion is <strong>permanent and irreversible</strong>. Once deleted, you will not be able to:
                      </p>
                      <ul>
                        <li>Access your attendance history</li>
                        <li>Recover any data associated with your account</li>
                        <li>Use the same credentials to create a new account</li>
                      </ul>
                      <p>
                        Please ensure you have downloaded any important data before proceeding.
                      </p>
                    </div>
                  </div>

                  <button type="submit" className="submit-btn">
                    <i className="fas fa-paper-plane"></i>
                    Submit Deletion Request
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="submission-success">
              <div className="success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <h2>Request Submitted Successfully!</h2>
              <p>
                Your account deletion request has been submitted. You should receive a confirmation email shortly.
                Our team will process your request within <strong>48 hours</strong>.
              </p>
              <div className="next-steps">
                <h3>What happens next?</h3>
                <ul>
                  <li>You'll receive an email confirmation within 1 hour</li>
                  <li>Our team will verify your identity (usually within 24 hours)</li>
                  <li>Your account will be permanently deleted within 48 hours</li>
                  <li>You'll receive a final confirmation email once deletion is complete</li>
                </ul>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="contact-section">
            <h2>📞 Need Help?</h2>
            <div className="contact-methods">
              <div className="contact-method">
                <div className="method-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="method-content">
                  <h3>Email Support</h3>
                  <p>For account deletion requests and support</p>
                  <a href="mailto:quickrollattendance@gmail.com">quickrollattendance@gmail.com</a>
                  <span className="response-time">Response within 24 hours</span>
                </div>
              </div>
              
              <div className="contact-method">
                <div className="method-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="method-content">
                  <h3>Data Protection Officer</h3>
                  <p>For privacy and data protection inquiries</p>
                  <a href="mailto:privacy@quickrollattendance.com">privacy@quickrollattendance.com</a>
                  <span className="response-time">Response within 48 hours</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Information */}
          <div className="legal-section">
            <h2>⚖️ Your Legal Rights</h2>
            <div className="legal-content">
              <p>
                Under data protection laws including GDPR, CCPA, and other applicable regulations, you have the right to:
              </p>
              <div className="rights-grid">
                <div className="right-item">
                  <i className="fas fa-eye"></i>
                  <span>Access your personal data</span>
                </div>
                <div className="right-item">
                  <i className="fas fa-edit"></i>
                  <span>Correct inaccurate information</span>
                </div>
                <div className="right-item">
                  <i className="fas fa-trash-alt"></i>
                  <span>Delete your personal data</span>
                </div>
                <div className="right-item">
                  <i className="fas fa-download"></i>
                  <span>Export your data</span>
                </div>
                <div className="right-item">
                  <i className="fas fa-ban"></i>
                  <span>Restrict data processing</span>
                </div>
                <div className="right-item">
                  <i className="fas fa-balance-scale"></i>
                  <span>Lodge a complaint with authorities</span>
                </div>
              </div>
              <p>
                For more information about your privacy rights, please review our 
                <a href="/privacy-policy"> Privacy Policy</a> or contact our Data Protection Officer.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="footer-links">
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms-of-service">Terms of Service</a>
            <a href="/contact">Contact Us</a>
            <a href="/">Back to QuickRoll</a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AccountDeletion;
