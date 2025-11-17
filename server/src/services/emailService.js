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

const createEmailTemplate = ({ title, bodyHtml, iconEmoji = '', button }) => {
  const buttonHtml = button
    ? `
    <table border="0" cellpadding="0" cellspacing="0" class="btn-container">
      <tr>
        <td align="center">
          <a href="${button.link}" target="_blank" class="button">${button.text}</a>
        </td>
      </tr>
    </table>
    `
    : '';

  const iconHtml = iconEmoji
    ? `<div class="icon-box">${iconEmoji}</div>`
    : '';

  // This is the new template HTML and CSS
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          width: 100% !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #1a1a1a;
          color: #e0e0e0;
        }
        .container {
          width: 100%;
          max-width: 550px;
          margin: 20px auto;
          background-color: #2b2b2b;
          border: 1px solid #444;
          border-radius: 16px;
          overflow: hidden;
        }
        .header {
          padding: 25px 30px;
          background-color: #333;
          border-bottom: 1px solid #444;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 24px;
          font-weight: 700;
        }
        .icon-box {
          padding-top: 40px;
          font-size: 48px;
          text-align: center;
        }
        .content {
          padding: 30px;
        }
        .content h2 {
          color: #ffffff;
          font-size: 22px;
          font-weight: 500;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .content p {
          color: #c0c0c0;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .content ul, .content ol {
          color: #c0c0c0;
          padding-left: 25px;
        }
        .content li {
          margin-bottom: 10px;
        }
        .code-box {
          background-color: #1a1a1a;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 15px 20px;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 3px;
          text-align: center;
          margin: 25px 0;
          color: #ffffff;
        }
        .btn-container {
          width: 100%;
          margin-top: 30px;
        }
        .button {
          display: inline-block;
          background-color: #007bff;
          color: #ffffff;
          font-size: 16px;
          font-weight: 500;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          transition: background-color 0.2s ease;
        }
        .button:hover {
          background-color: #0056b3;
        }
        .footer {
          padding: 30px;
          text-align: center;
          font-size: 12px;
          color: #888;
        }
        .footer p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center">
            <div class="container">
              <div class="header">
                <h1>QuickRoll</h1>
              </div>
              ${iconHtml}
              <div class="content">
                <h2>${title}</h2>
                ${bodyHtml}
                ${buttonHtml}
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} QuickRoll. All rights reserved.</p>
              <p>You're receiving this because of activity on your account.</p>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// --- 1. Password Reset Email (Refactored) ---
const sendPasswordResetCode = async (email, code) => {
  // Define the specific body content
  const bodyHtml = `
    <p>We received a request to reset the password for your QuickRoll account. If you did not make this request, please disregard this email.</p>
    <p>Your verification code is:</p>
    
    <div class="code-box">${code}</div>
    
    <p style="font-size: 14px; color: #888;">This code will expire in 5 minutes. For your security, do not share this code.</p>
  `;

  // Build the email using the new template
  const html = createEmailTemplate({
    iconEmoji: '🔒',
    title: 'Your Security Code',
    bodyHtml: bodyHtml
    // No button needed
  });

  const mailOptions = {
    from: '"QuickRoll Security" <security@quickrollattendance.live>',
    to: email,
    subject: 'QuickRoll Password Reset Code',
    html: html,
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

// --- 2. Faculty Credentials (Welcome) Email (Refactored) ---
const sendFacultyCredentials = async (email, name, facultyId) => {
  const bodyHtml = `
    <p>Dear ${name},</p>
    <p>We are thrilled to inform you that your faculty account for the <strong>QuickRoll Attendance System</strong> has been approved and is now active.</p>
    
    <p style="font-size: 14px; color: #888; margin-top: 20px;">Your account details for reference:</p>
    <ul style="font-size: 14px; list-style-type: none; padding-left: 0;">
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Faculty ID:</strong> ${facultyId}</li>
    </ul>

    <p>Your first step is to set a secure password for your account. Please click the button below to get started:</p>
  `;
  
  const html = createEmailTemplate({
    iconEmoji: '🚀',
    title: 'Welcome to QuickRoll!',
    bodyHtml: bodyHtml,
    button: {
      text: 'Set Your Password',
      link: `${process.env.FRONTEND_URL}/forgot-password`
    }
  });

  const mailOptions = {
    from: '"QuickRoll Team" <hello@quickrollattendance.live>',
    to: email,
    subject: 'Welcome to QuickRoll! Your Faculty Account is Ready',
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Faculty credentials email sent to ${email}`);
  } catch (error) {
    console.error('Faculty credentials email sending failed:', error);
    throw new Error('Failed to send faculty credentials email');
  }
};

// --- 3. Faculty Rejection Email (Refactored) ---
const sendFacultyRejectionEmail = async (email, name, reason = '') => {
  const reasonHtml = reason
    ? `<p><strong>Reason provided:</strong> ${reason}</p>`
    : '';
  
  const bodyHtml = `
    <p>Dear ${name},</p>
    <p>Thank you for your interest in the QuickRoll Attendance System. After a review of your faculty account request, we were unable to approve it at this time.</p>
    ${reasonHtml}
    <p>If you believe this was in error or have new information to provide, please contact your institution's administrator directly. We appreciate your understanding.</p>
  `;

  const html = createEmailTemplate({
    iconEmoji: 'ℹ️',
    title: 'Account Request Status',
    bodyHtml: bodyHtml
  });

  const mailOptions = {
    from: '"QuickRoll Accounts" <accounts@quickrollattendance.live>',
    to: email,
    subject: 'Update on Your QuickRoll Faculty Account Request',
    html: html,
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