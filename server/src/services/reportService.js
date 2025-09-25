const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Service for generating attendance reports
 */
class ReportService {
    /**
     * Generate an attendance report in PDF format
     * @param {Object} sessionData - Session data including department, semester, section, etc.
     * @param {Object} facultyData - Faculty information including name and email
     * @returns {Promise<string>} - Path to the generated PDF file
     */
    async generateAttendanceReport(sessionData, facultyData) {
        try {
            console.log('Generating attendance report...');
            
            // Create a unique filename for the report
            const filename = `attendance_report_${sessionData.department}_${sessionData.semester}_${sessionData.section}_${Date.now()}.pdf`;
            const tempDir = os.tmpdir();
            const filePath = path.join(tempDir, filename);
            
            // Create a new PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margin: 30,
                info: {
                    Title: `Attendance Report - ${sessionData.department} ${sessionData.semester} ${sessionData.section}`,
                    Author: facultyData.name,
                    Subject: 'Attendance Report',
                    Keywords: 'attendance, report, education',
                    CreationDate: new Date()
                }
            });
            
            // Pipe the PDF to a file
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);
            
            // Get current Indian time
            const indianTime = new Date().toLocaleString('en-US', { 
                timeZone: 'Asia/Kolkata',
                hour12: true,
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            // Header section
            // Add logo on the left side (placeholder - replace with actual logo path)
            const logoPath = path.join(__dirname, '../../public/logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 50, { width: 80, height: 80 });
            } else {
                // Create a placeholder if logo doesn't exist
                doc.rect(50, 50, 80, 80).stroke();
                doc.fontSize(8).text('Logo', 75, 85);
            }
            
            // Add header text on the right side
            doc.fontSize(20).font('Helvetica-Bold').text('ATTENDANCE REPORT', 150, 60, { align: 'center' });
            doc.fontSize(14).font('Helvetica-Oblique').text('Graphic Era Hill University (Dehradun)', 150, 85, { align: 'center' });
            doc.fontSize(16).font('Helvetica-Bold').text('QuickRoll Attendance System', 150, 105, { align: 'center' });
            doc.fontSize(12).font('Helvetica').text(`Generated on: ${indianTime}`, 150, 125, { align: 'center' });
            
            // Add separator line
            doc.moveDown(1);
            const yPosition = 150;
            doc.moveTo(50, yPosition).lineTo(doc.page.width - 50, yPosition).stroke();
            
            // Add session information in tabular format
            const startY = 180;
            const colWidth = 250;
            const rowHeight = 25;
            
            // Table headers
            doc.fontSize(14).font('Helvetica-Bold').text('Session Information :', 50, startY);
            doc.moveDown(0.5);
            
            // Table rows for session info
            const sessionInfoY = startY + 30;
            doc.fontSize(12).font('Helvetica-Bold').text('Department:', 50, sessionInfoY);
            doc.fontSize(12).font('Helvetica').text(sessionData.department, 150, sessionInfoY);
            
            doc.fontSize(12).font('Helvetica-Bold').text('Semester:', 50, sessionInfoY + rowHeight);
            doc.fontSize(12).font('Helvetica').text(sessionData.semester, 150, sessionInfoY + rowHeight);
            
            doc.fontSize(12).font('Helvetica-Bold').text('Section:', 50, sessionInfoY + rowHeight * 2);
            doc.fontSize(12).font('Helvetica').text(sessionData.section, 150, sessionInfoY + rowHeight * 2);
            
            doc.fontSize(12).font('Helvetica-Bold').text('Date:', 50, sessionInfoY + rowHeight * 3);
            doc.fontSize(12).font('Helvetica').text(new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' }), 150, sessionInfoY + rowHeight * 3);
            
            doc.fontSize(12).font('Helvetica-Bold').text('Time:', 50, sessionInfoY + rowHeight * 4);
            doc.fontSize(12).font('Helvetica').text(new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' }), 150, sessionInfoY + rowHeight * 4);
            
            doc.fontSize(12).font('Helvetica-Bold').text('Faculty:', 50, sessionInfoY + rowHeight * 5);
            doc.fontSize(12).font('Helvetica').text(facultyData.name, 150, sessionInfoY + rowHeight * 5);
            
            // Add attendance summary in tabular format
            const summaryY = sessionInfoY + rowHeight * 7;
            doc.fontSize(14).font('Helvetica-Bold').text('Attendance Summary :', 50, summaryY);
            doc.moveDown(0.5);
            
            // Table rows for attendance summary
            const attendanceSummaryY = summaryY + 30;
            doc.fontSize(12).font('Helvetica-Bold').text('Total Students:', 50, attendanceSummaryY);
            doc.fontSize(12).font('Helvetica').text(sessionData.totalStudents, 150, attendanceSummaryY);
            
            doc.fontSize(12).font('Helvetica-Bold').text('Present:', 50, attendanceSummaryY + rowHeight);
            doc.fontSize(12).font('Helvetica').text(sessionData.presentStudents.length, 150, attendanceSummaryY + rowHeight);
            
            doc.fontSize(12).font('Helvetica-Bold').text('Absent:', 50, attendanceSummaryY + rowHeight * 2);
            doc.fontSize(12).font('Helvetica').text(sessionData.absentees.length, 150, attendanceSummaryY + rowHeight * 2);
            
            const attendanceRate = (sessionData.presentStudents.length / sessionData.totalStudents) * 100;
            doc.fontSize(12).font('Helvetica-Bold').text('Attendance Rate:', 50, attendanceSummaryY + rowHeight * 3);
            doc.fontSize(12).font('Helvetica').text(`${attendanceRate.toFixed(2)}%`, 150, attendanceSummaryY + rowHeight * 3);
            
            // Add present students list
            const listsStartY = attendanceSummaryY + rowHeight * 5;
            if (sessionData.presentStudents.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('Present Students :', 50, listsStartY);
                doc.moveDown(0.5);
                doc.fontSize(12).font('Helvetica');
                
                // Create a formatted list of present students
                const presentStudentsFormatted = sessionData.presentStudents
                    .sort((a, b) => a.localeCompare(b))
                    .map(roll => `${roll}`)
                    .join(', ');
                
                doc.text(presentStudentsFormatted, 50, listsStartY + 25, {
                    width: 500,
                    align: 'left'
                });
                doc.moveDown(1);
            }
            
            // Add absent students list
            const absentListY = listsStartY + 80;
            if (sessionData.absentees.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('Absent Students :', 50, absentListY);
                doc.moveDown(0.5);
                doc.fontSize(12).font('Helvetica');
                
                // Create a formatted list of absent students
                const absenteesFormatted = sessionData.absentees
                    .sort((a, b) => a.localeCompare(b))
                    .map(roll => `${roll}`)
                    .join(', ');
                
                doc.text(absenteesFormatted, 50, absentListY + 25, {
                    width: 500,
                    align: 'left'
                });
            }
            
            // Add signature section
            doc.moveDown(2);
            doc.fontSize(12).font('Helvetica');
            doc.text('_______________________', { align: 'right' });
            doc.text(`${facultyData.name}`, { align: 'right' });
            doc.text('Faculty Signature', { align: 'right' });
            
            // Add clickable link to QuickRoll About Us page
            const aboutUsLink = 'https://www.quickrollattendance.live/about';
            doc.fontSize(12).fillColor('blue').text('Learn more about QuickRoll', {
                link: aboutUsLink,
                underline: true,
                align: 'center'
            });
            doc.fillColor('black');
            
            // Add footer with timestamp (always at the bottom)
            const footerText = `Generated by QuickRoll Attendance System on ${indianTime}`;
            doc.fontSize(10).font('Helvetica').text(footerText, {
                align: 'center',
                y: doc.page.height - 50
            });
            
            // Finalize the PDF
            doc.end();
            
            // Return a Promise that resolves when the PDF is written to disk
            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    console.log(`Report generated successfully at ${filePath}`);
                    resolve(filePath);
                });
                
                stream.on('error', (error) => {
                    console.error('Error generating report:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Error generating attendance report:', error);
            throw new Error(`Failed to generate attendance report: ${error.message}`);
        }
    }
    
    /**
     * Clean up a temporary file
     * @param {string} filePath - Path to the file to clean up
     */
    cleanupTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up temporary file: ${filePath}`);
            }
        } catch (error) {
            console.error(`Error cleaning up temporary file ${filePath}:`, error);
        }
    }
}

module.exports = new ReportService();
