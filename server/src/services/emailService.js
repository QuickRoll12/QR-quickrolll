// Make sure to configure your .env file with your MailerSend API_KEY
// TO THIS (CommonJS syntax):
require('dotenv/config');
const transporter = require('../config/emailConfig');
// const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

// // Initialize MailerSend
// const mailerSend = new MailerSend({
//   apiKey: process.env.MAILERSEND_API_KEY,
// });

// // Define the sender details once to be reused
// const sentFrom = new Sender("no-reply@quickrollattendance.live", "QuickRoll Attendance System");

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

// const sendPasswordResetCode = async (email, code) => {
//   const recipients = [
//     new Recipient(email, "User")
//   ];

//   const htmlContent = `
//     <h1>Password Reset Request</h1>
//     <p>You have requested to reset your password for the Attendance System.</p>
//     <p>Your verification code is: <strong>${code}</strong></p>
//     <p>This code will expire in 5 minutes.</p>
//     <p>If you didn't request this password reset, please ignore this email.</p>
//   `;

//   const emailParams = new EmailParams()
//     .setFrom(sentFrom)
//     .setTo(recipients)
//     .setReplyTo(sentFrom)
//     .setSubject("Password Reset Code - Attendance System")
//     .setHtml(htmlContent);

//   try {
//     // Replaced transporter.sendMail with mailerSend.email.send
//     await mailerSend.email.send(emailParams);
//   } catch (error) {
//     console.error('Password reset email sending failed:', error);
//     throw new Error('Failed to send password reset code');
//   }
// };

// const sendFacultyCredentials = async (email, name, facultyId, tempPassword) => {
//   const recipients = [
//     new Recipient(email, name) // Using the provided name for the recipient
//   ];

//   // Note: The tempPassword parameter is preserved but was not used in the original HTML.
//   const htmlContent = `
//     <h1>Welcome to QuickRoll Attendance System</h1>
//     <p>Dear ${name},</p>
//     <p>Your faculty account request has been approved. Here are your login credentials:</p>
//     <p><strong>Email:</strong> ${email}</p>
//     <p><strong>Faculty ID:</strong> ${facultyId}</p>
//     <p><strong>Steps required for login:</strong></p>
//       <ol>
//         <li>
//           Click this link to reset your password directly: 
//           <a href="${process.env.FRONTEND_URL}/forgot-password">Forgot Password?</a>
//         </li>
//         <li>Enter your Gmail address (the one you used while submitting the faculty request).</li>
//         <li>Enter your Faculty ID (provided in the email above).</li>
//         <li>Set your new password.</li>
//         <li>Submit the request.</li>
//       </ol>
//       <p>If successful, you will be redirected to the login page. If not, please cross-verify your Faculty ID and the new password you entered.</p>
//       <p>If you have any questions, please contact the administrator.</p>
//       <p>Thank you for using QuickRoll Attendance System.</p>
//       <p>Regard,<br>QuickRoll Attendance System</p>
//   `;

//   const emailParams = new EmailParams()
//     .setFrom(sentFrom)
//     .setTo(recipients)
//     .setReplyTo(sentFrom)
//     .setSubject("Your Faculty Account Credentials - QuickRoll Attendance System")
//     .setHtml(htmlContent);

//   try {
//     // Replaced transporter.sendMail with mailerSend.email.send
//     await mailerSend.email.send(emailParams);
//   } catch (error) {
//     console.error('Faculty credentials email sending failed:', error);
//     throw new Error('Failed to send faculty credentials email');
//   }
// };

// const sendFacultyRejectionEmail = async (email, name, reason = '') => {
//   const recipients = [
//     new Recipient(email, name)
//   ];

//   const htmlContent = `
//     <h1>QuickRoll Attendance System</h1>
//     <p>Dear ${name},</p>
//     <p>We regret to inform you that your faculty account request has been reviewed and could not be approved at this time.</p>
//     ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
//     <p>If you believe this is an error or would like more information, please contact the administrator.</p>
//     <p>You may submit a new request with updated information if needed.</p>
//     <p>Thank you for your interest in the QuickRoll Attendance System.</p>
//     <p>Regard,<br>QuickRoll Attendance System</p>
//   `;

//   const emailParams = new EmailParams()
//     .setFrom(sentFrom)
//     .setTo(recipients)
//     .setReplyTo(sentFrom)
//     .setSubject("Faculty Request Status - QuickRoll Attendance System")
//     .setHtml(htmlContent);

//   try {
//     // Replaced transporter.sendMail with mailerSend.email.send
//     await mailerSend.email.send(emailParams);
//   } catch (error) {
//     console.error('Faculty rejection email sending failed:', error);
//     throw new Error('Failed to send faculty rejection email');
//   }
// };


// AWS mail service:

/**
 * A reusable function to create a professional HTML email template.
 */
const createEmailTemplate = (title, bodyContent) => {
  return `
    <html lang="en">
    <head>
      <meta charset="UTF-M-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; }
        .container { width: 90%; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .content p { margin-bottom: 20px; }
        .code-box { background-color: #f4f4f4; border-radius: 5px; padding: 10px 20px; font-size: 28px; font-weight: bold; letter-spacing: 3px; text-align: center; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { background-color: #f9f9f9; color: #777; padding: 20px; text-align: center; font-size: 12px; }
        .footer p { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>QuickRoll</h1>
        </div>
        <div class="content">
          ${bodyContent}
          <p>Thank you,<br>The QuickRoll Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} QuickRoll. All rights reserved.</p>
          <p>You received this email because you are registered with our service.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// --- 1. Password Reset Email ---
const sendPasswordResetCode = async (email, code) => {
  const title = 'Password Reset Request';
  const bodyContent = `
    <p>Hello,</p>
    <p>We received a request to reset the password for your QuickRoll account associated with this email. If you did not make this request, please disregard this email.</p>
    <p>To proceed with the password reset, please use the following verification code:</p>
    
    <div class="code-box">${code}</div>
    
    <p>This code will expire in 5 minutes. For your security, please do not share this code with anyone.</p>
  `;

  const mailOptions = {
    from: 'security@quickrollattendance.live',
    to: email,
    subject: 'Your QuickRoll Password Reset Code',
    html: createEmailTemplate(title, bodyContent),
    text: `Your QuickRoll password reset code is: ${code}. It expires in 5 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset code sent to ${email}`);
  } catch (error) {
    console.error('Password reset email sending failed:', error);
    throw new Error('Failed to send password reset code');
  }
};

// --- 2. Faculty Credentials (Welcome) Email ---
const sendFacultyCredentials = async (email, name, facultyId) => {
  const title = 'Welcome to QuickRoll!';
  const bodyContent = `
    <p>Dear ${name},</p>
    <p>We are pleased to inform you that your faculty account for the <strong>QuickRoll Attendance System</strong> has been approved.</p>
    <p>To ensure your account's security, your first step is to set your personal password. Please follow these instructions:</p>
    
    <p><strong>Your Account Details (For Reference):</strong></p>
    <ul style="list-style-type: none; padding-left: 0;">
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Faculty ID:</strong> ${facultyId}</li>
    </ul>

    <p><strong>Steps to Get Started:</strong></p>
    <ol>
      <li>Visit the password reset page: <a href="${process.env.FRONTEND_URL}/forgot-password" class="button">Set Your Password</a></li>
      <li>Enter your email address (<strong>${email}</strong>).</li>
      <li>Enter your Faculty ID (<strong>${facultyId}</strong>).</li>
      <li>Follow the prompts to create your new, secure password.</li>
    </ol>
    <p>Once set, you can log in to the QuickRoll system. We're excited to have you on board.</p>
  `;

  const mailOptions = {
    from: 'notification@quickrollattendance.live',
    to: email,
    subject: 'Welcome to QuickRoll! Your Faculty Account is Ready',
    html: createEmailTemplate(title, bodyContent),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Faculty credentials email sent to ${email}`);
  } catch (error) {
    console.error('Faculty credentials email sending failed:', error);
    throw new Error('Failed to send faculty credentials email');
  }
};

// --- 3. Faculty Rejection Email ---
const sendFacultyRejectionEmail = async (email, name, reason = '') => {
  const title = 'QuickRoll Account Status';
  const bodyContent = `
    <p>Dear ${name},</p>
    <p>Thank you for your interest in the QuickRoll Attendance System. After a careful review of your faculty account request, we are unable to approve it at this time.</p>
    
    ${reason ? `<p><strong>Reason for rejection:</strong> ${reason}</p>` : ''}
    
    <p>If you believe this decision was made in error or if you have new information to provide, please contact your institution's administrator directly.</p>
    <p>We appreciate your understanding.</p>
  `;

  const mailOptions = {
    from: 'notification@quickrollattendance.live',
    to: email,
    subject: 'Update on Your QuickRoll Faculty Account Request',
    html: createEmailTemplate(title, bodyContent),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Faculty rejection email sent to ${email}`);
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