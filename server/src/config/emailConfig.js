const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.mailersend.net', // MailerSend SMTP host
  port: 587,                    // Use 465 if you want secure: true (SSL)
  auth: {
    user: process.env.EMAIL_USER,      // Should be: MS_abc123@yourdomain.com
    pass: process.env.EMAIL_PASSWORD   // Your generated SMTP password
  },
  secure: false,               // false for TLS on port 587, true for SSL on port 465
  debug: true,
  connectionTimeout: 10000,
  tls: {
    rejectUnauthorized: false
  }
});

module.exports = transporter;
