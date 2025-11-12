import React from 'react';
import '../styles/TermsOfService.css';

const TermsOfService = () => {
  const lastUpdated = "November 12, 2025";

  return (
    <div className="terms-container">
      {/* Header Section */}
      <div className="terms-header">
        <div className="terms-header-content">
          <h1 className="terms-title">Terms of Service</h1>
          <p className="terms-subtitle">
            Please read these terms carefully before using QuickRoll services.
          </p>
          <div className="last-updated">
            <span className="update-label">Last Updated:</span>
            <span className="update-date">{lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="terms-content">
        <div className="terms-container-inner">
          
          {/* Section 1: Acceptance */}
          <section className="terms-section">
            <h2>1. Acceptance of Terms</h2>
            <div className="section-content">
              <p>
                By accessing or using QuickRoll ("the Service"), you agree to be bound by these Terms of Service 
                and our Privacy Policy. If you do not agree to these terms, please do not use our services.
              </p>
              <p>
                These terms apply to all users of QuickRoll, including students, faculty members, and administrators.
              </p>
            </div>
          </section>

          {/* Section 2: Service Description */}
          <section className="terms-section">
            <h2>2. Service Description</h2>
            <div className="section-content">
              <p>
                QuickRoll is an attendance management system that provides:
              </p>
              <ul>
                <li>QR code-based attendance marking for students</li>
                <li>Real-time attendance tracking and reporting for faculty</li>
                <li>Administrative tools for managing attendance data</li>
                <li>Security features to prevent fraudulent attendance marking</li>
              </ul>
            </div>
          </section>

          {/* Section 3: User Accounts */}
          <section className="terms-section">
            <h2>3. User Accounts and Responsibilities</h2>
            <div className="section-content">
              <h3>3.1 Account Creation</h3>
              <p>
                User accounts are typically created by your educational institution. You are responsible for:
              </p>
              <ul>
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>

              <h3>3.2 Accurate Information</h3>
              <p>
                You agree to provide accurate and complete information and to keep your account information updated.
              </p>
            </div>
          </section>

          {/* Section 4: Acceptable Use */}
          <section className="terms-section">
            <h2>4. Acceptable Use Policy</h2>
            <div className="section-content">
              <h3>4.1 Permitted Uses</h3>
              <p>You may use QuickRoll only for legitimate educational purposes, including:</p>
              <ul>
                <li>Marking your own attendance when physically present</li>
                <li>Viewing your attendance records</li>
                <li>Managing attendance for your assigned courses (faculty)</li>
              </ul>

              <h3>4.2 Prohibited Activities</h3>
              <p>You agree NOT to:</p>
              <ul>
                <li>Mark attendance on behalf of others (proxy attendance)</li>
                <li>Share your login credentials with others</li>
                <li>Attempt to circumvent security measures</li>
                <li>Use automated tools or bots to interact with the service</li>
                <li>Reverse engineer or attempt to extract source code</li>
                <li>Interfere with the proper functioning of the service</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Security and Monitoring */}
          <section className="terms-section">
            <h2>5. Security and Anti-Fraud Measures</h2>
            <div className="section-content">
              <h3>5.1 Device Binding</h3>
              <p>
                Your account may be bound to specific devices for security purposes. 
                Attempting to use unauthorized devices may result in account suspension.
              </p>

              <h3>5.2 Camera Monitoring</h3>
              <p>
                The mobile application includes camera monitoring features to detect fraudulent attendance. 
                By using the app, you consent to this monitoring during active attendance sessions.
              </p>

              <h3>5.3 Violation Consequences</h3>
              <p>
                Violations of security policies may result in:
              </p>
              <ul>
                <li>Automatic removal from attendance sessions</li>
                <li>Account suspension or termination</li>
                <li>Reporting to your educational institution</li>
                <li>Academic disciplinary action</li>
              </ul>
            </div>
          </section>

          {/* Section 6: Privacy and Data */}
          <section className="terms-section">
            <h2>6. Privacy and Data Protection</h2>
            <div className="section-content">
              <p>
                Your privacy is important to us. Please review our 
                <a href="/privacy-policy" className="terms-link"> Privacy Policy</a> to understand 
                how we collect, use, and protect your information.
              </p>
              <p>
                By using QuickRoll, you consent to the collection and use of your data as described 
                in our Privacy Policy.
              </p>
            </div>
          </section>

          {/* Section 7: Intellectual Property */}
          <section className="terms-section">
            <h2>7. Intellectual Property Rights</h2>
            <div className="section-content">
              <p>
                QuickRoll and all related content, features, and functionality are owned by us and are 
                protected by copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                You may not copy, modify, distribute, sell, or lease any part of our services without 
                explicit written permission.
              </p>
            </div>
          </section>

          {/* Section 8: Service Availability */}
          <section className="terms-section">
            <h2>8. Service Availability and Modifications</h2>
            <div className="section-content">
              <h3>8.1 Availability</h3>
              <p>
                We strive to maintain high service availability but cannot guarantee uninterrupted access. 
                The service may be temporarily unavailable due to maintenance, updates, or technical issues.
              </p>

              <h3>8.2 Modifications</h3>
              <p>
                We reserve the right to modify, suspend, or discontinue any part of the service at any time 
                with reasonable notice to users.
              </p>
            </div>
          </section>

          {/* Section 9: Disclaimers */}
          <section className="terms-section">
            <h2>9. Disclaimers and Limitations</h2>
            <div className="section-content">
              <h3>9.1 Service Disclaimer</h3>
              <p>
                QuickRoll is provided "as is" without warranties of any kind. We do not guarantee that 
                the service will be error-free, secure, or continuously available.
              </p>

              <h3>9.2 Limitation of Liability</h3>
              <p>
                To the maximum extent permitted by law, we shall not be liable for any indirect, 
                incidental, special, or consequential damages arising from your use of the service.
              </p>
            </div>
          </section>

          {/* Section 10: Termination */}
          <section className="terms-section">
            <h2>10. Termination</h2>
            <div className="section-content">
              <p>
                We may terminate or suspend your access to QuickRoll at any time for violations of 
                these terms or for any other reason at our discretion.
              </p>
              <p>
                Upon termination, your right to use the service ceases immediately, but provisions 
                regarding intellectual property, disclaimers, and limitations of liability shall survive.
              </p>
            </div>
          </section>

          {/* Section 11: Governing Law */}
          <section className="terms-section">
            <h2>11. Governing Law and Disputes</h2>
            <div className="section-content">
              <p>
                These terms shall be governed by and construed in accordance with applicable laws. 
                Any disputes arising from these terms or your use of QuickRoll shall be resolved 
                through appropriate legal channels.
              </p>
            </div>
          </section>

          {/* Section 12: Changes to Terms */}
          <section className="terms-section">
            <h2>12. Changes to These Terms</h2>
            <div className="section-content">
              <p>
                We may update these Terms of Service from time to time. When we make significant changes, 
                we will notify users through the application or email.
              </p>
              <p>
                Your continued use of QuickRoll after changes take effect constitutes acceptance of the 
                updated terms.
              </p>
            </div>
          </section>

          {/* Section 13: Contact */}
          <section className="terms-section">
            <h2>13. Contact Information</h2>
            <div className="section-content">
              <p>
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="contact-details">
                <div className="contact-item">
                  <strong>Email:</strong> legal@quickrollattendance.com
                </div>
                <div className="contact-item">
                  <strong>Support:</strong> quickrollattendance@gmail.com
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="terms-footer">
            <div className="footer-content">
              <p>
                These terms are effective as of {lastUpdated} and apply to all users of QuickRoll services.
              </p>
              <div className="footer-links">
                <a href="/privacy-policy">Privacy Policy</a>
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

export default TermsOfService;
