const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

/**
 * 📊 REPORT GENERATION CONTROLLER
 * 
 * This controller implements the exact logic from the Python script for generating
 * attendance reports with Given Roll Number mapping.
 * 
 * Python Script Logic Translation:
 * 1. Parse CSV with exact column mapping
 * 2. Process Present/Absent roll numbers based on toggle
 * 3. Generate Excel with yellow highlighting for absent students
 * 4. Generate PDF with clean absentees table, one page per section
 */

class ReportController {
    constructor() {
        // Ensure reports directory exists
        this.reportsDir = path.join(__dirname, '../../public/reports');
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    /**
     * 🎯 EXACT PYTHON SCRIPT COLUMN MAPPING
     * Maps CSV columns to expected field names
     */
    getColumnMapping() {
        return {
            'S No.': 'serialNumber',
            'University Roll': 'universityRoll',
            'Student Name': 'studentName',
            'Real Section': 'realSection',
            'Class Roll Number': 'classRollNumber',
            'Mobile Number': 'mobileNumber',
            'Given Roll number': 'givenRollNumber'
        };
    }

    /**
     * 📁 Parse CSV file with exact Python script logic
     * @param {string} filePath - Path to uploaded CSV file
     * @returns {Promise<Array>} - Array of student objects
     */
    async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const students = [];
            const columnMapping = this.getColumnMapping();
            
            fs.createReadStream(filePath, { encoding: 'latin1' }) // Match Python encoding
                .pipe(csv())
                .on('data', (row) => {
                    // Map CSV columns to our field names
                    const student = {};
                    Object.keys(columnMapping).forEach(csvColumn => {
                        const fieldName = columnMapping[csvColumn];
                        student[fieldName] = row[csvColumn] || '';
                    });
                    
                    // Convert Given Roll number to integer for processing
                    if (student.givenRollNumber) {
                        student.givenRollNumber = parseInt(student.givenRollNumber);
                    }
                    
                    students.push(student);
                })
                .on('end', () => {
                    console.log(`📁 Parsed ${students.length} students from CSV`);
                    resolve(students);
                })
                .on('error', (error) => {
                    console.error('❌ CSV parsing error:', error);
                    reject(error);
                });
        });
    }

    /**
     * 🎯 EXACT PYTHON SCRIPT ATTENDANCE LOGIC
     * Processes attendance based on Given Roll numbers and mode
     * @param {Array} students - Array of student objects
     * @param {string} rollNumberInput - Comma-separated roll numbers
     * @param {string} attendanceMode - 'present' or 'absent'
     * @returns {Array} - Students with attendance status
     */
    processAttendance(students, rollNumberInput, attendanceMode) {
        // Get all valid Given Roll numbers (Python: all_given_roll_numbers)
        const allGivenRollNumbers = new Set(students.map(s => s.givenRollNumber));
        
        // Process input roll numbers (Python: input_roll_numbers)
        const inputRollNumbers = new Set();
        const invalidNumbers = [];
        
        if (rollNumberInput && rollNumberInput.trim()) {
            const rawNumbers = rollNumberInput.split(',');
            
            for (const numStr of rawNumbers) {
                const trimmed = numStr.trim();
                if (trimmed) {
                    try {
                        const numInt = parseInt(trimmed);
                        if (allGivenRollNumbers.has(numInt)) {
                            inputRollNumbers.add(numInt);
                        } else {
                            invalidNumbers.push(trimmed);
                        }
                    } catch (error) {
                        invalidNumbers.push(trimmed);
                    }
                }
            }
        }

        // Log invalid numbers (Python: warning section)
        if (invalidNumbers.length > 0) {
            console.log(`⚠️ Invalid Given Roll numbers ignored: ${invalidNumbers.join(', ')}`);
        }

        // Determine positive and negative status based on mode (Python: status_type logic)
        let positiveStatus, negativeStatus;
        if (attendanceMode === 'present') {
            positiveStatus = 'Present';
            negativeStatus = 'Absent';
        } else {
            positiveStatus = 'Absent';
            negativeStatus = 'Present';
        }

        // Apply attendance status (Python: get_status function)
        const studentsWithAttendance = students.map(student => {
            const attendanceStatus = inputRollNumbers.has(student.givenRollNumber) 
                ? positiveStatus 
                : negativeStatus;
                
            return {
                ...student,
                attendanceStatus
            };
        });

        // Sort by Section and Class Roll Number (Python: sort_values)
        studentsWithAttendance.sort((a, b) => {
            if (a.realSection !== b.realSection) {
                return a.realSection.localeCompare(b.realSection);
            }
            return parseInt(a.classRollNumber) - parseInt(b.classRollNumber);
        });

        console.log(`🎯 Processed attendance: ${inputRollNumbers.size} ${attendanceMode}, ${invalidNumbers.length} invalid`);
        
        return {
            students: studentsWithAttendance,
            stats: {
                totalStudents: students.length,
                processedRollNumbers: inputRollNumbers.size,
                invalidRollNumbers: invalidNumbers.length,
                presentCount: studentsWithAttendance.filter(s => s.attendanceStatus === 'Present').length,
                absentCount: studentsWithAttendance.filter(s => s.attendanceStatus === 'Absent').length
            }
        };
    }

    /**
     * 📊 Generate Excel report with yellow highlighting (Python: xlsxwriter logic)
     * @param {Array} students - Students with attendance status
     * @returns {Promise<string>} - Path to generated Excel file
     */
    async generateExcelReport(students) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        // Add headers (Python: column order)
        const headers = [
            'Section',
            'Class Roll Number', 
            'Student Name',
            'University Roll Number',
            'Attendance Status'
        ];
        
        worksheet.addRow(headers);

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        students.forEach(student => {
            const row = worksheet.addRow([
                student.realSection,
                student.classRollNumber,
                student.studentName,
                student.universityRoll,
                student.attendanceStatus
            ]);

            // Apply yellow highlighting for absent students (Python: absent_format)
            if (student.attendanceStatus === 'Absent') {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFF21' } // Yellow: #FFDE21 -> FFFFFF21
                };
                row.font = { color: { argb: 'FF9C0006' } }; // Dark red text
            }
        });

        // Auto-fit column widths (Python: set_column logic)
        worksheet.columns.forEach((column, index) => {
            let maxLength = headers[index].length;
            
            students.forEach(student => {
                const values = [
                    student.realSection,
                    student.classRollNumber,
                    student.studentName,
                    student.universityRoll,
                    student.attendanceStatus
                ];
                const cellValue = String(values[index] || '');
                maxLength = Math.max(maxLength, cellValue.length);
            });
            
            column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
        });

        // Save file
        const fileName = `attendance_report_${uuidv4()}.xlsx`;
        const filePath = path.join(this.reportsDir, fileName);
        
        await workbook.xlsx.writeFile(filePath);
        console.log(`📊 Excel report generated: ${fileName}`);
        
        return fileName;
    }

    /**
     * 📄 Generate PDF report with absentees (Python: FPDF logic)
     * @param {Array} students - Students with attendance status
     * @returns {Promise<string>} - Path to generated PDF file
     */
    async generatePDFReport(students) {
        const fileName = `absentees_report_${uuidv4()}.pdf`;
        const filePath = path.join(this.reportsDir, fileName);
        
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(filePath));

        // Filter absentees
        const absentees = students.filter(s => s.attendanceStatus === 'Absent');
        
        if (absentees.length === 0) {
            // No absentees case (Python: empty absentees logic)
            doc.fontSize(16).font('Helvetica-Bold');
            doc.text('Absentees List', { align: 'center' });
            doc.moveDown(2);
            
            doc.fontSize(12).font('Helvetica');
            doc.text('All students are marked Present. No absentees.', { align: 'left' });
        } else {
            // Group by section (Python: groupby logic)
            const sectionGroups = {};
            absentees.forEach(student => {
                if (!sectionGroups[student.realSection]) {
                    sectionGroups[student.realSection] = [];
                }
                sectionGroups[student.realSection].push(student);
            });

            // Generate one page per section (Python: add_page for each section)
            let isFirstSection = true;
            
            Object.keys(sectionGroups).forEach(section => {
                if (!isFirstSection) {
                    doc.addPage();
                }
                isFirstSection = false;

                // Section title (Python: section title)
                doc.fontSize(16).font('Helvetica-Bold');
                doc.text(`Absentees List: Section ${section}`, { align: 'center' });
                doc.moveDown(2);

                // Table header (Python: table header)
                doc.fontSize(12).font('Helvetica-Bold');
                const startY = doc.y;
                doc.text('Class Roll No.', 50, startY, { width: 100 });
                doc.text('Student Name', 150, startY, { width: 300 });
                
                // Header underline
                doc.moveTo(50, doc.y + 5).lineTo(450, doc.y + 5).stroke();
                doc.moveDown(1);

                // Table rows (Python: table rows)
                doc.font('Helvetica');
                sectionGroups[section].forEach(student => {
                    const rowY = doc.y;
                    doc.text(student.classRollNumber, 50, rowY, { width: 100 });
                    doc.text(student.studentName, 150, rowY, { width: 300 });
                    doc.moveDown(0.8);
                });
            });
        }

        doc.end();
        console.log(`📄 PDF report generated: ${fileName}`);
        
        return fileName;
    }

    /**
     * 🚀 Main API endpoint for generating custom reports
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async generateCustomReport(req, res) {
        try {
            const { rollNumbers, attendanceMode } = req.body;
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is required'
                });
            }

            if (!rollNumbers || !rollNumbers.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Roll numbers are required'
                });
            }

            if (!['present', 'absent'].includes(attendanceMode)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid attendance mode. Must be "present" or "absent"'
                });
            }

            console.log(`🎯 Starting report generation: ${attendanceMode} mode, file: ${req.file.originalname}`);

            // Parse CSV file
            const students = await this.parseCSV(req.file.path);
            
            if (students.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is empty or invalid'
                });
            }

            // Validate CSV structure
            const requiredFields = ['givenRollNumber', 'studentName', 'realSection', 'classRollNumber'];
            const firstStudent = students[0];
            const missingFields = requiredFields.filter(field => !firstStudent.hasOwnProperty(field));
            
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `CSV missing required columns: ${missingFields.join(', ')}`
                });
            }

            // Process attendance with Python script logic
            const { students: processedStudents, stats } = this.processAttendance(
                students, 
                rollNumbers, 
                attendanceMode
            );

            // Generate reports
            const [excelFileName, pdfFileName] = await Promise.all([
                this.generateExcelReport(processedStudents),
                this.generatePDFReport(processedStudents)
            ]);

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            // Return download URLs
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            
            res.json({
                success: true,
                message: 'Reports generated successfully',
                reports: {
                    excelUrl: `${baseUrl}/reports/${excelFileName}`,
                    pdfUrl: `${baseUrl}/reports/${pdfFileName}`
                },
                stats: {
                    ...stats,
                    mode: attendanceMode,
                    fileName: req.file.originalname
                }
            });

            console.log(`✅ Reports generated successfully: Excel(${excelFileName}), PDF(${pdfFileName})`);

        } catch (error) {
            console.error('❌ Report generation error:', error);
            
            // Clean up uploaded file if it exists
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to generate reports',
                error: error.message
            });
        }
    }
}

// Export singleton instance
module.exports = new ReportController();
