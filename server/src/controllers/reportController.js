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
            'University Roll Number': 'universityRoll',
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
                    const student = {};
                    Object.keys(columnMapping).forEach(csvColumn => {
                        const fieldName = columnMapping[csvColumn];
                        student[fieldName] = row[csvColumn] || '';
                    });
                    
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
     */
    processAttendance(students, rollNumberInput, attendanceMode) {
        const allGivenRollNumbers = new Set(students.map(s => s.givenRollNumber));
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

        if (invalidNumbers.length > 0) {
            console.log(`⚠️ Invalid Given Roll numbers ignored: ${invalidNumbers.join(', ')}`);
        }

        let positiveStatus, negativeStatus;
        if (attendanceMode === 'present') {
            positiveStatus = 'Present';
            negativeStatus = 'Absent';
        } else {
            positiveStatus = 'Absent';
            negativeStatus = 'Present';
        }

        const studentsWithAttendance = students.map(student => {
            const attendanceStatus = inputRollNumbers.has(student.givenRollNumber) 
                ? positiveStatus 
                : negativeStatus;
                
            return {
                ...student,
                attendanceStatus
            };
        });

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
     */
    async generateExcelReport(students) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        const headers = [
            'Section',
            'Class Roll Number', 
            'Student Name',
            'University Roll Number',
            'Attendance Status'
        ];
        
        worksheet.addRow(headers);

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        students.forEach((student, index) => {
            const rowData = [
                student.realSection,
                student.classRollNumber,
                student.studentName,
                student.universityRoll, 
                student.attendanceStatus
            ];
            
            const row = worksheet.addRow(rowData);

            if (student.attendanceStatus === 'Absent') {
                const redFill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC7CE' } // Light red fill
                };
                const redFont = { color: { argb: 'FF9C0006' } }; // Dark red text

                for (let col = 1; col <= 5; col++) {
                    const cell = row.getCell(col);
                    cell.fill = redFill;
                    cell.font = redFont;
                }
            }
        });

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
            
            column.width = Math.min(maxLength + 2, 50);
        });

        workbook.creator = 'QuickRoll Attendance System';
        workbook.lastModifiedBy = 'QuickRoll System';
        workbook.created = new Date();
        workbook.modified = new Date();

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

        // --- ✅ NEW: Reusable function to draw the table header with Section ---
        const drawHeader = (currentY) => {
            const tableTop = currentY;
            const tableLeft = 40;
            const tableWidth = 515; // A4 width (595) - 80 (margins)
            // --- ✅ NEW: Adjusted column widths ---
            const colWidths = [80, 120, 315]; // Section, Class Roll No., Student Name
            const rowHeight = 25;

            doc.fontSize(12).font('Helvetica-Bold');
            
            doc.rect(tableLeft, tableTop, tableWidth, rowHeight)
               .fillAndStroke('#f0f0f0', '#000000');
            
            doc.fillColor('#000000');
            
            // --- ✅ NEW: Draw 3 header cells ---
            doc.text('Section', tableLeft + 5, tableTop + 7, { 
                width: colWidths[0] - 10, 
                align: 'center' 
            });
            doc.text('Class Roll No.', tableLeft + colWidths[0] + 5, tableTop + 7, { 
                width: colWidths[1] - 10, 
                align: 'center' 
            });
            doc.text('Student Name', tableLeft + colWidths[0] + colWidths[1] + 5, tableTop + 7, { 
                width: colWidths[2] - 10, 
                align: 'center' 
            });

            // --- ✅ NEW: Draw 2 vertical lines ---
            doc.moveTo(tableLeft + colWidths[0], tableTop)
               .lineTo(tableLeft + colWidths[0], tableTop + rowHeight)
               .stroke();
            doc.moveTo(tableLeft + colWidths[0] + colWidths[1], tableTop)
               .lineTo(tableLeft + colWidths[0] + colWidths[1], tableTop + rowHeight)
               .stroke();
        };
        // --- END OF HEADER FUNCTION ---

        // Filter absentees
        const absentees = students.filter(s => s.attendanceStatus === 'Absent');
        
        if (absentees.length === 0) {
            // No absentees case
            doc.fontSize(18).font('Helvetica-Bold');
            doc.text('Absentees List', { align: 'center' });
            doc.moveDown(2);
            doc.fontSize(12).font('Helvetica');
            doc.text('All students are marked Present. No absentees.', { align: 'center' });
        } else {
            // Group by section
            const sectionGroups = {};
            absentees.forEach(student => {
                if (!sectionGroups[student.realSection]) {
                    sectionGroups[student.realSection] = [];
                }
                sectionGroups[student.realSection].push(student);
            });

            let isFirstSection = true;
            
            Object.keys(sectionGroups).sort().forEach(section => {
                if (!isFirstSection) {
                    doc.addPage();
                }
                isFirstSection = false;

                doc.fontSize(18).font('Helvetica-Bold');
                doc.text(`Absentees List: Section ${section}`, { align: 'center' });
                doc.moveDown(1.5);

                const tableLeft = 40;
                // --- ✅ NEW: Adjusted column widths ---
                const colWidths = [80, 120, 315]; // Section, Class Roll No., Student Name
                const tableWidth = colWidths.reduce((a, b) => a + b, 0); // 515
                const rowHeight = 25;
                const pageBottom = doc.page.height - doc.page.margins.bottom;

                let currentY = doc.y;
                drawHeader(currentY);
                currentY += rowHeight;

                doc.font('Helvetica');
                
                sectionGroups[section].forEach((student, index) => {
                    if (currentY + rowHeight > pageBottom) {
                        doc.addPage();
                        currentY = doc.page.margins.top;
                        drawHeader(currentY);
                        currentY += rowHeight;
                        doc.font('Helvetica');
                    }
                    
                    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
                    doc.rect(tableLeft, currentY, tableWidth, rowHeight)
                       .fillAndStroke(bgColor, '#000000');
                    
                    doc.fillColor('#000000');
                    
                    // --- ✅ NEW: Draw 3 data cells ---
                    doc.text(student.realSection, tableLeft + 5, currentY + 7, { 
                        width: colWidths[0] - 10, 
                        align: 'center' 
                    });
                    doc.text(student.classRollNumber, tableLeft + colWidths[0] + 5, currentY + 7, { 
                        width: colWidths[1] - 10, 
                        align: 'center' 
                    });
                    doc.text(student.studentName, tableLeft + colWidths[0] + colWidths[1] + 5, currentY + 7, { 
                        width: colWidths[2] - 10, 
                        align: 'left' 
                    });

                    // --- ✅ NEW: Draw 2 vertical lines ---
                    doc.moveTo(tableLeft + colWidths[0], currentY)
                       .lineTo(tableLeft + colWidths[0], currentY + rowHeight)
                       .stroke();
                    doc.moveTo(tableLeft + colWidths[0] + colWidths[1], currentY)
                       .lineTo(tableLeft + colWidths[0] + colWidths[1], currentY + rowHeight)
                       .stroke();

                    currentY += rowHeight;
                });

                // --- ✅ NEW: Add enhanced stats at the bottom ---
                if (currentY + 20 > pageBottom) {
                    doc.addPage();
                }
                
                // Calculate stats
                const allSectionStudents = students.filter(s => s.realSection === section);
                const total = allSectionStudents.length;
                const absentCount = sectionGroups[section].length;
                const presentCount = total - absentCount;
                const summaryText = `Total Students: ${total}  |  Present: ${presentCount}  |  Absent: ${absentCount}`;

                doc.moveDown(1.5);
                doc.fontSize(12).font('Helvetica-Bold');
                doc.text(summaryText, { align: 'right' });
            });
        }

        doc.end();
        console.log(`📄 PDF report generated: ${fileName}`);
        
        return fileName;
    }

    /**
     * 🚀 Main API endpoint for generating custom reports
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

            const students = await this.parseCSV(req.file.path);
            
            if (students.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'CSV file is empty or invalid'
                });
            }

            const requiredFields = ['givenRollNumber', 'studentName', 'realSection', 'classRollNumber', 'universityRoll'];
            const firstStudent = students[0];
            const missingFields = requiredFields.filter(field => !firstStudent.hasOwnProperty(field));
            
            if (missingFields.length > 0) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: `CSV missing required columns. Your CSV must have headers: ${missingFields.join(', ')}`
                });
            }

            const { students: processedStudents, stats } = this.processAttendance(
                students, 
                rollNumbers, 
                attendanceMode
            );

            const [excelFileName, pdfFileName] = await Promise.all([
                this.generateExcelReport(processedStudents),
                this.generatePDFReport(processedStudents) // Passes the full list
            ]);

            fs.unlinkSync(req.file.path);

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
