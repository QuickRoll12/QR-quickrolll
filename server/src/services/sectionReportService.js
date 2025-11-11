const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

/**
 * 📊 SECTION-WISE REPORT SERVICE
 * 
 * This service processes attendance records and maps them to real student data
 * using CSV files stored in the section-csvs directory.
 */
class SectionReportService {
    constructor() {
        // Directory where section CSV files are stored
        this.csvDirectory = path.join(__dirname, '../../uploads/section-csvs');
        
        // Ensure directory exists
        if (!fs.existsSync(this.csvDirectory)) {
            fs.mkdirSync(this.csvDirectory, { recursive: true });
            console.log('📁 Created section-csvs directory');
        }
    }

    /**
     * 🎯 EXACT CSV COLUMN MAPPING (from reportController.js)
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
     * 📁 Parse CSV file with exact same logic as reportController
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Array>} - Array of student objects
     */
    async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const students = [];
            const columnMapping = this.getColumnMapping();
            
            fs.createReadStream(filePath, { encoding: 'latin1' })
                .pipe(csv())
                .on('data', (row) => {
                    const student = {};
                    Object.keys(columnMapping).forEach(csvColumn => {
                        const fieldName = columnMapping[csvColumn];
                        student[fieldName] = row[csvColumn] || '';
                    });
                    
                    // Convert givenRollNumber to integer
                    if (student.givenRollNumber) {
                        student.givenRollNumber = parseInt(student.givenRollNumber);
                    }
                    
                    students.push(student);
                })
                .on('end', () => {
                    console.log(`📁 Parsed ${students.length} students from ${path.basename(filePath)}`);
                    resolve(students);
                })
                .on('error', (error) => {
                    console.error('❌ CSV parsing error:', error);
                    reject(error);
                });
        });
    }

    /**
     * 🔍 Find CSV file for section (case-insensitive)
     * @param {string} sectionName - Section name (e.g., "DSA", "OS")
     * @returns {string|null} - Full path to CSV file or null if not found
     */
    findSectionCSV(sectionName) {
        try {
            const files = fs.readdirSync(this.csvDirectory);
            const targetFileName = `${sectionName.toLowerCase()}.csv`;
            
            // Case-insensitive search
            const foundFile = files.find(file => 
                file.toLowerCase() === targetFileName
            );
            
            if (foundFile) {
                const fullPath = path.join(this.csvDirectory, foundFile);
                console.log(`📄 Found CSV file: ${foundFile} for section: ${sectionName}`);
                return fullPath;
            }
            
            console.log(`❌ CSV file not found for section: ${sectionName}`);
            return null;
        } catch (error) {
            console.error('❌ Error searching for CSV file:', error);
            return null;
        }
    }

    /**
     * 🎯 Process attendance data and map to real student information
     * @param {string} sectionName - Section name for CSV lookup
     * @param {Array} presentRollNumbers - Array of present roll numbers
     * @param {Array} absentRollNumbers - Array of absent roll numbers
     * @returns {Promise<Object>} - Processed section-wise data
     */
    async processAttendanceReport(sectionName, presentRollNumbers, absentRollNumbers) {
        try {
            // Find CSV file for this section
            const csvPath = this.findSectionCSV(sectionName);
            
            if (!csvPath) {
                throw new Error('This section does not contain Multiple sections data');
            }

            // Parse CSV file
            const students = await this.parseCSV(csvPath);
            
            if (students.length === 0) {
                throw new Error('CSV file is empty or invalid');
            }

            // Create sets for faster lookup
            const presentSet = new Set(presentRollNumbers.map(roll => parseInt(roll)));
            const absentSet = new Set(absentRollNumbers.map(roll => parseInt(roll)));
            
            // Map roll numbers to student data
            const processedStudents = students.map(student => {
                let attendanceStatus = 'Not Marked';
                
                if (presentSet.has(student.givenRollNumber)) {
                    attendanceStatus = 'Present';
                } else if (absentSet.has(student.givenRollNumber)) {
                    attendanceStatus = 'Absent';
                }
                
                return {
                    ...student,
                    attendanceStatus
                };
            });

            // Group students by real section
            const sectionGroups = {};
            processedStudents.forEach(student => {
                const realSection = student.realSection || 'Unknown';
                
                if (!sectionGroups[realSection]) {
                    sectionGroups[realSection] = {
                        sectionName: realSection,
                        present: [],
                        absent: [],
                        notMarked: [],
                        stats: { total: 0, present: 0, absent: 0, notMarked: 0, percentage: 0 }
                    };
                }
                
                const group = sectionGroups[realSection];
                group.stats.total++;
                
                if (student.attendanceStatus === 'Present') {
                    group.present.push(student);
                    group.stats.present++;
                } else if (student.attendanceStatus === 'Absent') {
                    group.absent.push(student);
                    group.stats.absent++;
                } else {
                    group.notMarked.push(student);
                    group.stats.notMarked++;
                }
            });

            // Calculate percentages and sort students within each section
            Object.values(sectionGroups).forEach(group => {
                group.stats.percentage = group.stats.total > 0 
                    ? Math.round((group.stats.present / group.stats.total) * 100) 
                    : 0;
                
                // Sort students by class roll number within each section
                const sortByRoll = (a, b) => parseInt(a.classRollNumber || 0) - parseInt(b.classRollNumber || 0);
                group.present.sort(sortByRoll);
                group.absent.sort(sortByRoll);
                group.notMarked.sort(sortByRoll);
            });

            // Convert to array and sort by section name
            const sections = Object.values(sectionGroups).sort((a, b) => 
                a.sectionName.localeCompare(b.sectionName)
            );

            // Calculate overall statistics
            const overall = {
                totalStudents: processedStudents.length,
                totalPresent: sections.reduce((sum, section) => sum + section.stats.present, 0),
                totalAbsent: sections.reduce((sum, section) => sum + section.stats.absent, 0),
                totalNotMarked: sections.reduce((sum, section) => sum + section.stats.notMarked, 0),
                totalSections: sections.length
            };
            overall.percentage = overall.totalStudents > 0 
                ? Math.round((overall.totalPresent / overall.totalStudents) * 100) 
                : 0;

            console.log(`✅ Processed attendance report for ${sectionName}: ${sections.length} sections, ${overall.totalStudents} students`);

            return {
                success: true,
                data: {
                    sections,
                    overall,
                    sectionName,
                    processedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('❌ Error processing attendance report:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 📋 Get list of available CSV files
     * @returns {Array} - Array of available section names
     */
    getAvailableSections() {
        try {
            const files = fs.readdirSync(this.csvDirectory);
            return files
                .filter(file => file.endsWith('.csv'))
                .map(file => file.replace('.csv', '').toUpperCase());
        } catch (error) {
            console.error('❌ Error reading CSV directory:', error);
            return [];
        }
    }
}

module.exports = new SectionReportService();
