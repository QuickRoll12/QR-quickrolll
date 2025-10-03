// Make sure to configure your .env file with your MailerSend API_KEY
import 'dotenv/config';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

// Initialize MailerSend
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

// Define the sender details once to be reused
const sentFrom = new Sender("qrquickroll@quickrollattendance.live", "QuickRoll Attendance System");

const sendVerificationEmail = async (email, token) => {
  // Create API endpoint URL for verification (logic remains unchanged)
  const apiVerificationUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${token}`;

  // Create frontend URL for verification page (logic remains unchanged)
  // Note: This variable was not used in the original HTML, but the logic is preserved.
  const frontendVerificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  // Define recipients for MailerSend
  const recipients = [
    new Recipient(email, "User") // Using a generic name "User" as name is not provided
  ];

  // HTML content remains exactly the same
  const htmlContent = `
    <h1>Welcome to the Attendance System</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${apiVerificationUrl}">Verify Email</a>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't create this account, please ignore this email.</p>
  `;

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Verify Your Email - Attendance System")
    .setHtml(htmlContent);

  try {
    // Replaced transporter.sendMail with mailerSend.email.send
    await mailerSend.email.send(emailParams);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send verification email');
  }
};

const sendPasswordResetCode = async (email, code) => {
  const recipients = [
    new Recipient(email, "User")
  ];

  const htmlContent = `
    <h1>Password Reset Request</h1>
    <p>You have requested to reset your password for the Attendance System.</p>
    <p>Your verification code is: <strong>${code}</strong></p>
    <p>This code will expire in 5 minutes.</p>
    <p>If you didn't request this password reset, please ignore this email.</p>
  `;

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Password Reset Code - Attendance System")
    .setHtml(htmlContent);

  try {
    // Replaced transporter.sendMail with mailerSend.email.send
    await mailerSend.email.send(emailParams);
  } catch (error) {
    console.error('Password reset email sending failed:', error);
    throw new Error('Failed to send password reset code');
  }
};

const sendFacultyCredentials = async (email, name, facultyId, tempPassword) => {
  const recipients = [
    new Recipient(email, name) // Using the provided name for the recipient
  ];

  // Note: The tempPassword parameter is preserved but was not used in the original HTML.
  const htmlContent = `
    <h1>Welcome to QuickRoll Attendance System</h1>
    <p>Dear ${name},</p>
    <p>Your faculty account request has been approved. Here are your login credentials:</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Faculty ID:</strong> ${facultyId}</p>
    <p><strong>Steps required for login:</strong></p>
      <ol>
        <li>
          Click this link to reset your password directly: 
          <a href="https://quick-roll-test-uzkx.onrender.com/forgot-password">Forgot Password?</a>
        </li>
        <li>Enter your Gmail address (the one you used while submitting the faculty request).</li>
        <li>Enter your Faculty ID (provided in the email above).</li>
        <li>Set your new password.</li>
        <li>Submit the request.</li>
      </ol>
      <p>If successful, you will be redirected to the login page. If not, please cross-verify your Faculty ID and the new password you entered.</p>
      <p>If you have any questions, please contact the administrator.</p>
      <p>Thank you for using QuickRoll Attendance System.</p>
      <p>Regard,<br>QuickRoll Attendance System</p>
  `;

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Your Faculty Account Credentials - QuickRoll Attendance System")
    .setHtml(htmlContent);

  try {
    // Replaced transporter.sendMail with mailerSend.email.send
    await mailerSend.email.send(emailParams);
  } catch (error) {
    console.error('Faculty credentials email sending failed:', error);
    throw new Error('Failed to send faculty credentials email');
  }
};

const sendFacultyRejectionEmail = async (email, name, reason = '') => {
  const recipients = [
    new Recipient(email, name)
  ];

  const htmlContent = `
    <h1>QuickRoll Attendance System</h1>
    <p>Dear ${name},</p>
    <p>We regret to inform you that your faculty account request has been reviewed and could not be approved at this time.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>If you believe this is an error or would like more information, please contact the administrator.</p>
    <p>You may submit a new request with updated information if needed.</p>
    <p>Thank you for your interest in the QuickRoll Attendance System.</p>
    <p>Regard,<br>QuickRoll Attendance System</p>
  `;

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Faculty Request Status - QuickRoll Attendance System")
    .setHtml(htmlContent);

  try {
    // Replaced transporter.sendMail with mailerSend.email.send
    await mailerSend.email.send(emailParams);
  } catch (error) {
    console.error('Faculty rejection email sending failed:', error);
    throw new Error('Failed to send faculty rejection email');
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetCode,
  sendFacultyCredentials,
  sendFacultyRejectionEmail
};