import React, { useState } from 'react';
import '../styles/Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Contact form submitted:', formData);
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="contact-container">
      {/* Header Section */}
      <div className="contact-header">
        <div className="contact-header-content">
          <h1 className="contact-title">Contact Us</h1>
          <p className="contact-subtitle">
            Have questions about QuickRoll? We're here to help!
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="contact-content">
        <div className="contact-container-inner">
          
          {/* Contact Information */}
          <div className="contact-info-section">
            <div className="contact-methods">
              
              <div className="contact-method">
                <div className="method-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="method-content">
                  <h3>Email Support</h3>
                  <p>Get help with technical issues and general inquiries</p>
                  <a href="mailto:quickrollattendance@gmail.com">quickrollattendance@gmail.com</a>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="method-content">
                  <h3>Privacy & Legal</h3>
                  <p>Questions about privacy, data protection, and legal matters</p>
                  <a href="mailto:privacy@quickrollattendance.com">privacy@quickrollattendance.com</a>
                </div>
              </div>

              <div className="contact-method">
                <div className="method-icon">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <div className="method-content">
                  <h3>Educational Institutions</h3>
                  <p>Interested in implementing QuickRoll at your institution?</p>
                  <a href="mailto:partnerships@quickrollattendance.com">partnerships@quickrollattendance.com</a>
                </div>
              </div>

            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-section">
            <div className="form-container">
              <h2>Send us a Message</h2>
              <p>Fill out the form below and we'll get back to you as soon as possible.</p>
              
              <form onSubmit={handleSubmit} className="contact-form">
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
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="technical-support">Technical Support</option>
                    <option value="account-issues">Account Issues</option>
                    <option value="privacy-concerns">Privacy Concerns</option>
                    <option value="feature-request">Feature Request</option>
                    <option value="institutional-inquiry">Institutional Inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="6"
                    placeholder="Please describe your inquiry in detail..."
                  ></textarea>
                </div>

                <button type="submit" className="submit-btn">
                  <i className="fas fa-paper-plane"></i>
                  Send Message
                </button>
              </form>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            
            <div className="faq-grid">
              <div className="faq-item">
                <h3>How do I reset my password?</h3>
                <p>
                  Use the "Forgot Password" link on the login page. You'll receive an email with 
                  instructions to reset your password.
                </p>
              </div>

              <div className="faq-item">
                <h3>Why can't I mark attendance?</h3>
                <p>
                  Ensure you're within the designated location, have camera permissions enabled, 
                  and are scanning the correct QR code during an active session.
                </p>
              </div>

              <div className="faq-item">
                <h3>How is my data protected?</h3>
                <p>
                  We use industry-standard encryption and security measures. Read our 
                  <a href="/privacy-policy"> Privacy Policy</a> for detailed information.
                </p>
              </div>

              <div className="faq-item">
                <h3>Can I use QuickRoll on multiple devices?</h3>
                <p>
                  For security reasons, your account may be bound to specific devices. 
                  Contact your institution's administrator for device management.
                </p>
              </div>
            </div>
          </div>

          {/* Response Time Notice */}
          <div className="response-notice">
            <div className="notice-content">
              <div className="notice-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="notice-text">
                <h3>Response Time</h3>
                <p>
                  We typically respond to inquiries within 24-48 hours during business days. 
                  For urgent technical issues, please contact your institution's IT support.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contact;
