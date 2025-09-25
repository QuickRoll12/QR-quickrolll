const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Service for sending attendance reports via email
 */
class ReportEmailService {
    /**
     * Send an attendance report via email
     * @param {Object} options - Email options including recipient, subject, and attachment path
     * @returns {Promise<Object>} - Result of the email sending operation
     */
    async sendAttendanceReport(options) {
        try {
            console.log('Preparing to send attendance report email...');
            
            // Validate required parameters
            if (!options.to || !options.subject || !options.attachmentPath) {
                throw new Error('Missing required email parameters');
            }
            
            // Check if the attachment file exists
            if (!fs.existsSync(options.attachmentPath)) {
                throw new Error(`Attachment file not found: ${options.attachmentPath}`);
            }
            
            // Create email transporter using environment variables
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
            
            // Format date for email
            const formattedDate = options.date || new Date().toLocaleDateString();
            
            // Create email HTML content
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h1 style="color: #2196f3; text-align: center;">Attendance Report</h1>
                    <p style="text-align: center; color: #757575;">Generated on ${formattedDate}</p>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    
                    <h2 style="color: #333;">Session Details</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Department:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${options.department}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Semester:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${options.semester}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Section:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${options.section}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Date:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${formattedDate}</td>
                        </tr>
                    </table>
                    
                    <h2 style="color: #333;">Attendance Summary</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Total Students:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${options.totalStudents}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Present:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${options.presentCount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Absent:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${options.absentCount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Attendance Rate:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${((options.presentCount / options.totalStudents) * 100).toFixed(2)}%</td>
                        </tr>
                    </table>
                    
                    <p style="margin-top: 30px; color: #757575; font-size: 14px; text-align: center;">
                        This is an automated email sent by the QuickRoll Attendance System.<br>
                        Please find the detailed attendance report attached to this email.
                    </p>
                </div>
            `;
            
            // Configure email options
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: options.to,
                subject: options.subject,
                html: htmlContent,
                attachments: [
                    {
                        filename: path.basename(options.attachmentPath),
                        path: options.attachmentPath,
                        contentType: 'application/pdf'
                    }
                ]
            };
            
            // Send the email
            console.log(`Sending attendance report to ${options.to}...`);
            const info = await transporter.sendMail(mailOptions);
            
            console.log(`Email sent successfully: ${info.messageId}`);
            return {
                success: true,
                messageId: info.messageId,
                message: `Report sent to ${options.to}`
            };
        } catch (error) {
            console.error('Error sending attendance report email:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to send email: ${error.message}`
            };
        }
    }

    /**
     * Send a general email without attachments
     * @param {Object} options - Email options including recipient, subject, and HTML content
     * @returns {Promise<Object>} - Result of the email sending operation
     */
    async sendEmail(options) {
        try {
            // Validate required parameters
            if (!options.to || !options.subject) {
                throw new Error('Missing required email parameters (to, subject)');
            }
            
            // Create email transporter using environment variables
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
            
            // Format dates if needed
            let emailHtml = options.html || '';
            
            // If the email is being sent in IST timezone context, ensure proper formatting
            // This assumes dates in the email content use standard ${date} and ${time} format
            if (emailHtml.includes('today') || emailHtml.includes('Date:') || emailHtml.includes('Time:')) {
                // Replace any date formatting to ensure consistency in emails
                const now = new Date();
                const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
                
                const istTime = ist.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit', 
                    hour12: true
                });
                
                const istDate = ist.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                
                // Only apply formatting if explicit markers aren't already in the HTML
                if (!options.preserveFormatting) {
                    emailHtml = emailHtml
                        .replace(/\b\d{1,2}[-\/]\d{1,2}[-\/]\d{4}\b/g, istDate)
                        .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s?(AM|PM|am|pm)?\b/g, istTime);
                }
            }
            
            // Configure email options
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: options.to,
                subject: options.subject,
                html: emailHtml,
                text: options.text || ''
            };
            
            // Add attachments if provided
            if (options.attachments && Array.isArray(options.attachments)) {
                mailOptions.attachments = options.attachments;
            }
            
            // Send the email
            const info = await transporter.sendMail(mailOptions);
            
            console.log(`Email sent successfully to ${options.to}: ${info.messageId}`);
            return {
                success: true,
                messageId: info.messageId,
                message: `Email sent to ${options.to}`
            };
        } catch (error) {
            console.error('Error sending email:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to send email: ${error.message}`
            };
        }
    }
}

module.exports = new ReportEmailService();