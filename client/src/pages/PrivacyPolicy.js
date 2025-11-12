import React from 'react';
import '../styles/PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const lastUpdated = "November 12, 2025";

  return (
    <div className="privacy-policy-container">
      {/* Header Section */}
      <div className="privacy-header">
        <div className="privacy-header-content">
          <h1 className="privacy-title">Privacy Policy</h1>
          <p className="privacy-subtitle">
            Your privacy is important to us. This policy explains how QuickRoll collects, uses, and protects your information.
          </p>
          <div className="last-updated">
            <span className="update-label">Last Updated:</span>
            <span className="update-date">{lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="privacy-content">
        <div className="privacy-container">
          
          {/* Table of Contents */}
          <div className="table-of-contents">
            <h2>Table of Contents</h2>
            <ul>
              <li><a href="#overview">1. Overview</a></li>
              <li><a href="#information-collection">2. Information We Collect</a></li>
              <li><a href="#how-we-use">3. How We Use Your Information</a></li>
              <li><a href="#data-sharing">4. Data Sharing and Disclosure</a></li>
              <li><a href="#data-security">5. Data Security</a></li>
              <li><a href="#data-retention">6. Data Retention</a></li>
              <li><a href="#your-rights">7. Your Rights and Choices</a></li>
              <li><a href="#cookies">8. Cookies and Tracking</a></li>
              <li><a href="#third-party">9. Third-Party Services</a></li>
              <li><a href="#children-privacy">10. Children's Privacy</a></li>
              <li><a href="#international">11. International Data Transfers</a></li>
              <li><a href="#changes">12. Changes to This Policy</a></li>
              <li><a href="#contact">13. Contact Information</a></li>
            </ul>
          </div>

          {/* Section 1: Overview */}
          <section id="overview" className="privacy-section">
            <h2>1. Overview</h2>
            <div className="section-content">
              <p>
                QuickRoll is an attendance management system designed for educational institutions. 
                We are committed to protecting your privacy and ensuring transparency in how we handle your personal information.
              </p>
              <div className="info-box">
                <h3>What is QuickRoll?</h3>
                <p>
                  QuickRoll consists of two main applications:
                </p>
                <ul>
                  <li><strong>Faculty Web Application:</strong> Used by teachers and administrators to manage attendance sessions, generate reports, and monitor student participation.</li>
                  <li><strong>Student Mobile Application:</strong> Used by students to mark attendance via QR code scanning and view their attendance history.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Information Collection */}
          <section id="information-collection" className="privacy-section">
            <h2>2. Information We Collect</h2>
            <div className="section-content">
              
              <div className="data-category">
                <h3>2.1 Personal Information</h3>
                <p>We collect the following personal information:</p>
                <ul>
                  <li><strong>Student Information:</strong> Name, email address, student ID, roll number, course, semester, section, department</li>
                  <li><strong>Faculty Information:</strong> Name, email address, faculty ID, department, subjects taught</li>
                  <li><strong>Authentication Data:</strong> Encrypted passwords, login credentials</li>
                  <li><strong>Profile Photos:</strong> Optional profile pictures for identification purposes</li>
                </ul>
              </div>

              <div className="data-category">
                <h3>2.2 Attendance Data</h3>
                <p>We collect attendance-related information including:</p>
                <ul>
                  <li>Attendance records (present/absent status)</li>
                  <li>Timestamps of attendance marking</li>
                  <li>Session information (subject, date, duration)</li>
                  <li>QR code scan data and validation results</li>
                </ul>
              </div>

              <div className="data-category">
                <h3>2.3 Device and Technical Information</h3>
                <p>For security and functionality purposes, we collect:</p>
                <ul>
                  <li><strong>Device Identifiers:</strong> Android ID for device binding and security</li>
                  <li><strong>Camera Access:</strong> Used for QR code scanning and anti-proxy monitoring</li>
                  <li><strong>Location Data:</strong> Approximate location for attendance validation (when enabled)</li>
                  <li><strong>App Usage Data:</strong> Session duration, feature usage, error logs</li>
                  <li><strong>Network Information:</strong> IP address, connection type for security monitoring</li>
                </ul>
              </div>

              <div className="data-category">
                <h3>2.4 Security Monitoring Data</h3>
                <p>To prevent fraudulent attendance marking, we collect:</p>
                <ul>
                  <li>Camera usage patterns and availability</li>
                  <li>App switching behavior during attendance sessions</li>
                  <li>Device fingerprinting data for authentication</li>
                  <li>WebRTC IP addresses for network validation</li>
                </ul>
              </div>

              <div className="warning-box">
                <h3>⚠️ Important Note on Camera Monitoring</h3>
                <p>
                  Our mobile app includes camera monitoring functionality to prevent proxy attendance. 
                  This feature only activates during active attendance sessions and monitors camera availability 
                  to detect if other applications are using the camera simultaneously. We do not capture, 
                  store, or transmit any camera images or videos through this monitoring system.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: How We Use Information */}
          <section id="how-we-use" className="privacy-section">
            <h2>3. How We Use Your Information</h2>
            <div className="section-content">
              
              <div className="usage-category">
                <h3>3.1 Primary Functions</h3>
                <ul>
                  <li>Managing and recording student attendance</li>
                  <li>Generating attendance reports and analytics</li>
                  <li>Facilitating communication between faculty and students</li>
                  <li>Providing attendance history and statistics</li>
                </ul>
              </div>

              <div className="usage-category">
                <h3>3.2 Security and Fraud Prevention</h3>
                <ul>
                  <li>Preventing proxy attendance and fraudulent marking</li>
                  <li>Device authentication and validation</li>
                  <li>Monitoring for suspicious activities</li>
                  <li>Ensuring data integrity and system security</li>
                </ul>
              </div>

              <div className="usage-category">
                <h3>3.3 Service Improvement</h3>
                <ul>
                  <li>Analyzing usage patterns to improve functionality</li>
                  <li>Troubleshooting technical issues</li>
                  <li>Developing new features and enhancements</li>
                  <li>Optimizing app performance and user experience</li>
                </ul>
              </div>

              <div className="usage-category">
                <h3>3.4 Communication</h3>
                <ul>
                  <li>Sending attendance notifications and reminders</li>
                  <li>Providing system updates and maintenance notices</li>
                  <li>Responding to user inquiries and support requests</li>
                  <li>Delivering important announcements</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: Data Sharing */}
          <section id="data-sharing" className="privacy-section">
            <h2>4. Data Sharing and Disclosure</h2>
            <div className="section-content">
              
              <div className="sharing-category">
                <h3>4.1 Within Educational Institution</h3>
                <p>We share data within your educational institution as necessary:</p>
                <ul>
                  <li>Faculty members can access attendance data for their assigned courses</li>
                  <li>Administrative staff can access reports and analytics</li>
                  <li>Students can access their own attendance records</li>
                </ul>
              </div>

              <div className="sharing-category">
                <h3>4.2 Third-Party Service Providers</h3>
                <p>We may share data with trusted service providers who assist us in:</p>
                <ul>
                  <li><strong>Cloud Hosting:</strong> Secure data storage and application hosting</li>
                  <li><strong>Email Services:</strong> Sending notifications and communications</li>
                  <li><strong>Analytics:</strong> Understanding app usage and performance</li>
                  <li><strong>Security Services:</strong> Monitoring and preventing security threats</li>
                </ul>
                <p>All third-party providers are bound by strict confidentiality agreements.</p>
              </div>

              <div className="sharing-category">
                <h3>4.3 Legal Requirements</h3>
                <p>We may disclose information when required by law or to:</p>
                <ul>
                  <li>Comply with legal processes or government requests</li>
                  <li>Protect our rights, property, or safety</li>
                  <li>Protect the rights, property, or safety of our users</li>
                  <li>Investigate potential violations of our terms of service</li>
                </ul>
              </div>

              <div className="no-sale-box">
                <h3>🚫 We Do Not Sell Your Data</h3>
                <p>
                  QuickRoll does not sell, rent, or trade your personal information to third parties 
                  for marketing or commercial purposes. Your data is used solely for the educational 
                  and administrative purposes outlined in this policy.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Data Security */}
          <section id="data-security" className="privacy-section">
            <h2>5. Data Security</h2>
            <div className="section-content">
              
              <div className="security-measure">
                <h3>5.1 Technical Safeguards</h3>
                <ul>
                  <li><strong>Encryption:</strong> All data is encrypted in transit and at rest using industry-standard protocols</li>
                  <li><strong>Secure Authentication:</strong> Multi-factor authentication and secure password requirements</li>
                  <li><strong>Access Controls:</strong> Role-based access with principle of least privilege</li>
                  <li><strong>Regular Security Audits:</strong> Ongoing monitoring and vulnerability assessments</li>
                </ul>
              </div>

              <div className="security-measure">
                <h3>5.2 Physical Safeguards</h3>
                <ul>
                  <li>Secure data centers with restricted access</li>
                  <li>Environmental controls and monitoring</li>
                  <li>Backup and disaster recovery procedures</li>
                  <li>24/7 security monitoring and incident response</li>
                </ul>
              </div>

              <div className="security-measure">
                <h3>5.3 Administrative Safeguards</h3>
                <ul>
                  <li>Employee background checks and security training</li>
                  <li>Confidentiality agreements and data handling policies</li>
                  <li>Regular security awareness training</li>
                  <li>Incident response and breach notification procedures</li>
                </ul>
              </div>

              <div className="security-measure">
                <h3>5.4 Mobile App Security</h3>
                <ul>
                  <li><strong>Screenshot Prevention:</strong> Sensitive screens are protected from screenshots</li>
                  <li><strong>App Integrity:</strong> Protection against tampering and reverse engineering</li>
                  <li><strong>Secure Communication:</strong> All API communications use HTTPS encryption</li>
                  <li><strong>Device Binding:</strong> Attendance tied to specific authorized devices</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6: Data Retention */}
          <section id="data-retention" className="privacy-section">
            <h2>6. Data Retention</h2>
            <div className="section-content">
              
              <div className="retention-policy">
                <h3>6.1 Retention Periods</h3>
                <ul>
                  <li><strong>Attendance Records:</strong> Retained for the duration of the academic program plus 7 years for academic records</li>
                  <li><strong>User Account Data:</strong> Retained while account is active plus 2 years after deactivation</li>
                  <li><strong>Security Logs:</strong> Retained for 1 year for security monitoring purposes</li>
                  <li><strong>Technical Data:</strong> Retained for 6 months for troubleshooting and improvement</li>
                </ul>
              </div>

              <div className="retention-policy">
                <h3>6.2 Data Deletion</h3>
                <p>We automatically delete data when:</p>
                <ul>
                  <li>Retention periods expire</li>
                  <li>User accounts are permanently deleted</li>
                  <li>Legal requirements for data deletion are met</li>
                  <li>Users exercise their right to deletion (where applicable)</li>
                </ul>
              </div>

              <div className="retention-policy">
                <h3>6.3 Backup and Archive</h3>
                <p>
                  Backup copies may be retained for disaster recovery purposes but are subject to the same 
                  security measures and deletion schedules as primary data.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Your Rights */}
          <section id="your-rights" className="privacy-section">
            <h2>7. Your Rights and Choices</h2>
            <div className="section-content">
              
              <div className="user-rights">
                <h3>7.1 Access and Portability</h3>
                <ul>
                  <li>View your personal information and attendance records</li>
                  <li>Download your data in a portable format</li>
                  <li>Request copies of your information</li>
                </ul>
              </div>

              <div className="user-rights">
                <h3>7.2 Correction and Updates</h3>
                <ul>
                  <li>Update your profile information</li>
                  <li>Correct inaccurate data</li>
                  <li>Request corrections to attendance records (subject to institutional policies)</li>
                </ul>
              </div>

              <div className="user-rights">
                <h3>7.3 Deletion and Restriction</h3>
                <ul>
                  <li>Request deletion of your account and associated data</li>
                  <li>Restrict processing of your information</li>
                  <li>Object to certain types of data processing</li>
                </ul>
                <div className="deletion-link-box">
                  <h4>🗑️ Request Account Deletion</h4>
                  <p>
                    Want to delete your QuickRoll account? Visit our dedicated account deletion page 
                    for a secure and transparent process.
                  </p>
                  <a href="/account-deletion" className="deletion-link-btn">
                    Request Account Deletion
                  </a>
                  <p className="deletion-note">
                    <strong>Processing Time:</strong> Your request will be processed within 48 hours. 
                    Contact <a href="mailto:quickrollattendance@gmail.com">quickrollattendance@gmail.com</a> for assistance.
                  </p>
                </div>
              </div>

              <div className="user-rights">
                <h3>7.4 Communication Preferences</h3>
                <ul>
                  <li>Opt-out of non-essential communications</li>
                  <li>Choose notification preferences</li>
                  <li>Update contact information</li>
                </ul>
              </div>

              <div className="rights-note">
                <h3>📝 Important Note</h3>
                <p>
                  Some rights may be limited by educational institution policies or legal requirements. 
                  For example, attendance records may need to be retained for academic and regulatory compliance.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8: Cookies */}
          <section id="cookies" className="privacy-section">
            <h2>8. Cookies and Tracking Technologies</h2>
            <div className="section-content">
              
              <div className="cookie-category">
                <h3>8.1 Essential Cookies</h3>
                <p>Required for basic functionality:</p>
                <ul>
                  <li>Authentication and session management</li>
                  <li>Security and fraud prevention</li>
                  <li>Load balancing and performance</li>
                </ul>
              </div>

              <div className="cookie-category">
                <h3>8.2 Functional Cookies</h3>
                <p>Enhance user experience:</p>
                <ul>
                  <li>Remember user preferences</li>
                  <li>Language and region settings</li>
                  <li>Accessibility features</li>
                </ul>
              </div>

              <div className="cookie-category">
                <h3>8.3 Analytics Cookies</h3>
                <p>Help us improve our services:</p>
                <ul>
                  <li>Usage statistics and patterns</li>
                  <li>Performance monitoring</li>
                  <li>Error tracking and debugging</li>
                </ul>
              </div>

              <div className="cookie-control">
                <h3>🍪 Cookie Control</h3>
                <p>
                  You can control cookies through your browser settings. However, disabling essential 
                  cookies may affect the functionality of QuickRoll.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9: Third-Party Services */}
          <section id="third-party" className="privacy-section">
            <h2>9. Third-Party Services</h2>
            <div className="section-content">
              
              <div className="third-party-service">
                <h3>9.1 Cloud Infrastructure</h3>
                <p>We use reputable cloud service providers for:</p>
                <ul>
                  <li>Application hosting and data storage</li>
                  <li>Content delivery and performance optimization</li>
                  <li>Backup and disaster recovery</li>
                </ul>
              </div>

              <div className="third-party-service">
                <h3>9.2 Communication Services</h3>
                <p>Third-party services for:</p>
                <ul>
                  <li>Email delivery and notifications</li>
                  <li>SMS messaging (if enabled)</li>
                  <li>Push notifications for mobile apps</li>
                </ul>
              </div>

              <div className="third-party-service">
                <h3>9.3 Analytics and Monitoring</h3>
                <p>We may use services for:</p>
                <ul>
                  <li>Application performance monitoring</li>
                  <li>Error tracking and debugging</li>
                  <li>Usage analytics and insights</li>
                </ul>
              </div>

              <div className="third-party-note">
                <h3>🔗 Third-Party Links</h3>
                <p>
                  Our applications may contain links to third-party websites or services. 
                  We are not responsible for the privacy practices of these external sites.
                </p>
              </div>
            </div>
          </section>

          {/* Section 10: Children's Privacy */}
          <section id="children-privacy" className="privacy-section">
            <h2>10. Children's Privacy</h2>
            <div className="section-content">
              
              <div className="children-policy">
                <h3>10.1 Age Requirements</h3>
                <p>
                  QuickRoll is designed for educational institutions and may be used by students of various ages. 
                  We comply with applicable laws regarding children's privacy, including COPPA (Children's Online Privacy Protection Act).
                </p>
              </div>

              <div className="children-policy">
                <h3>10.2 Parental Consent</h3>
                <p>For users under 13 years of age:</p>
                <ul>
                  <li>We require verifiable parental consent before collecting personal information</li>
                  <li>Parents can review, modify, or delete their child's information</li>
                  <li>We limit data collection to what is necessary for educational purposes</li>
                </ul>
              </div>

              <div className="children-policy">
                <h3>10.3 Educational Context</h3>
                <p>
                  When used in an educational setting, schools may provide consent on behalf of students 
                  for educational activities as permitted by FERPA (Family Educational Rights and Privacy Act).
                </p>
              </div>
            </div>
          </section>

          {/* Section 11: International Transfers */}
          <section id="international" className="privacy-section">
            <h2>11. International Data Transfers</h2>
            <div className="section-content">
              
              <div className="transfer-info">
                <h3>11.1 Data Location</h3>
                <p>
                  Your data may be stored and processed in servers located in different countries. 
                  We ensure that all international transfers comply with applicable data protection laws.
                </p>
              </div>

              <div className="transfer-info">
                <h3>11.2 Safeguards</h3>
                <p>When transferring data internationally, we implement:</p>
                <ul>
                  <li>Standard contractual clauses approved by data protection authorities</li>
                  <li>Adequacy decisions where available</li>
                  <li>Additional security measures and encryption</li>
                  <li>Regular compliance monitoring and audits</li>
                </ul>
              </div>

              <div className="transfer-info">
                <h3>11.3 Your Rights</h3>
                <p>
                  You have the right to obtain information about international transfers and 
                  the safeguards in place to protect your data.
                </p>
              </div>
            </div>
          </section>

          {/* Section 12: Changes to Policy */}
          <section id="changes" className="privacy-section">
            <h2>12. Changes to This Privacy Policy</h2>
            <div className="section-content">
              
              <div className="changes-info">
                <h3>12.1 Policy Updates</h3>
                <p>
                  We may update this privacy policy from time to time to reflect changes in our practices, 
                  technology, legal requirements, or other factors.
                </p>
              </div>

              <div className="changes-info">
                <h3>12.2 Notification of Changes</h3>
                <p>When we make significant changes, we will:</p>
                <ul>
                  <li>Update the "Last Updated" date at the top of this policy</li>
                  <li>Notify users through the application or email</li>
                  <li>Provide a summary of key changes</li>
                  <li>Allow time for review before changes take effect</li>
                </ul>
              </div>

              <div className="changes-info">
                <h3>12.3 Continued Use</h3>
                <p>
                  Your continued use of QuickRoll after policy changes indicates your acceptance 
                  of the updated terms. If you disagree with changes, you may discontinue using our services.
                </p>
              </div>
            </div>
          </section>

          {/* Section 13: Contact Information */}
          <section id="contact" className="privacy-section">
            <h2>13. Contact Information</h2>
            <div className="section-content">
              
              <div className="contact-info">
                <h3>13.1 Privacy Questions</h3>
                <p>
                  If you have questions about this privacy policy or our data practices, 
                  please contact us:
                </p>
                <div className="contact-details">
                  <div className="contact-item">
                    <strong>Email:</strong> privacy@quickrollattendance.com
                  </div>
                  <div className="contact-item">
                    <strong>Support Email:</strong> quickrollattendance@gmail.com
                  </div>
                  <div className="contact-item">
                    <strong>Response Time:</strong> We aim to respond within 48 hours
                  </div>
                </div>
              </div>

              <div className="contact-info">
                <h3>13.2 Data Protection Officer</h3>
                <p>
                  For data protection inquiries, you can contact our Data Protection Officer at:
                  <br />
                  <strong>Email:</strong> dpo@quickrollattendance.com
                </p>
              </div>

              <div className="contact-info">
                <h3>13.3 Regulatory Authorities</h3>
                <p>
                  You have the right to lodge a complaint with your local data protection authority 
                  if you believe we have not addressed your concerns adequately.
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="privacy-footer">
            <div className="footer-content">
              <p>
                This privacy policy is effective as of {lastUpdated} and applies to all users of QuickRoll services.
              </p>
              <div className="footer-links">
                <a href="/terms-of-service">Terms of Service</a>
                <a href="/account-deletion">Account Deletion</a>
                <a href="/contact">Contact Us</a>
                <a href="/">Back to QuickRoll</a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
