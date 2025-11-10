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
        students.forEach((student, index) => {
            const rowData = [
                student.realSection,
                student.classRollNumber,
                student.studentName,
                student.universityRoll, // ✅ Fixed: Using universityRoll field
                student.attendanceStatus
            ];
            
            const row = worksheet.addRow(rowData);

            // Apply yellow highlighting for absent students (Python: absent_format)
            // ✅ Fixed: Only highlight data columns (A to E), not entire row
            if (student.attendanceStatus === 'Absent') {
                for (let col = 1; col <= 5; col++) { // Only columns A-E
                    const cell = row.getCell(col);
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFFF21' } // Yellow: #FFDE21
                    };
                    cell.font = { color: { argb: 'FF9C0006' } }; // Dark red text
                }
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
                    student.universityRoll, // ✅ Fixed: Using universityRoll field
                    student.attendanceStatus
                ];
                const cellValue = String(values[index] || '');
                maxLength = Math.max(maxLength, cellValue.length);
            });
            
            column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
        });

        // ✅ Fixed: Set proper Excel properties for direct download
        workbook.creator = 'QuickRoll Attendance System';
        workbook.lastModifiedBy = 'QuickRoll System';
        workbook.created = new Date();
        workbook.modified = new Date();

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
        
        const doc = new PDFDocument({ 
            margin: 40,
            size: 'A4'
        });
        doc.pipe(fs.createWriteStream(filePath));

        // Filter absentees
        const absentees = students.filter(s => s.attendanceStatus === 'Absent');
        
        if (absentees.length === 0) {
            // No absentees case (Python: empty absentees logic)
            doc.fontSize(18).font('Helvetica-Bold');
            doc.text('Absentees List', { align: 'center' });
            doc.moveDown(2);
            
            doc.fontSize(12).font('Helvetica');
            doc.text('All students are marked Present. No absentees.', { align: 'center' });
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
            
            Object.keys(sectionGroups).sort().forEach(section => {
                if (!isFirstSection) {
                    doc.addPage();
                }
                isFirstSection = false;

                // ✅ Professional Section Title (matching Python format)
                doc.fontSize(18).font('Helvetica-Bold');
                doc.text(`Absentees List: Section ${section}`, { align: 'center' });
                doc.moveDown(1.5);

                // ✅ Professional Table with Borders (matching Python FPDF)
                const tableTop = doc.y;
                const tableLeft = 40;
                const tableWidth = 515; // A4 width - margins
                const colWidths = [120, 395]; // Class Roll No., Student Name
                const rowHeight = 25;
                
                // Draw table header with borders
                doc.fontSize(12).font('Helvetica-Bold');
                
                // Header background (light gray)
                doc.rect(tableLeft, tableTop, tableWidth, rowHeight)
                   .fillAndStroke('#f0f0f0', '#000000');
                
                // Header text
                doc.fillColor('#000000');
                doc.text('Class Roll No.', tableLeft + 5, tableTop + 7, { 
                    width: colWidths[0] - 10, 
                    align: 'center' 
                });
                doc.text('Student Name', tableLeft + colWidths[0] + 5, tableTop + 7, { 
                    width: colWidths[1] - 10, 
                    align: 'center' 
                });

                // Draw vertical line between columns in header
                doc.moveTo(tableLeft + colWidths[0], tableTop)
                   .lineTo(tableLeft + colWidths[0], tableTop + rowHeight)
                   .stroke();

                // Table data rows with borders
                doc.font('Helvetica');
                let currentY = tableTop + rowHeight;
                
                sectionGroups[section].forEach((student, index) => {
                    // Draw row background (alternating white/light gray)
                    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
                    doc.rect(tableLeft, currentY, tableWidth, rowHeight)
                       .fillAndStroke(bgColor, '#000000');
                    
                    // Row text
                    doc.fillColor('#000000');
                    doc.text(student.classRollNumber, tableLeft + 5, currentY + 7, { 
                        width: colWidths[0] - 10, 
                        align: 'center' 
                    });
                    doc.text(student.studentName, tableLeft + colWidths[0] + 5, currentY + 7, { 
                        width: colWidths[1] - 10, 
                        align: 'left' 
                    });

                    // Draw vertical line between columns
                    doc.moveTo(tableLeft + colWidths[0], currentY)
                       .lineTo(tableLeft + colWidths[0], currentY + rowHeight)
                       .stroke();

                    currentY += rowHeight;
                });

                // ✅ Add summary at bottom of each section
                doc.moveDown(1);
                doc.fontSize(10).font('Helvetica-Oblique');
                doc.text(`Total Absentees in Section ${section}: ${sectionGroups[section].length}`, 
                    { align: 'right' });
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
