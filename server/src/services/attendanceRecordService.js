const fs = require('fs');
const path = require('path');
const { cloudinary } = require('../config/cloudinary');
const reportService = require('./reportService');
const AttendanceRecord = require('../models/AttendanceRecord');

/**
 * Service for managing attendance records and PDF reports
 */
class AttendanceRecordService {
  /**
   * Save attendance session data and generate/upload PDF report
   * @param {Object} sessionData - Session data including department, semester, section, etc.
   * @param {Object} facultyData - Faculty information including name, email, and facultyId
   * @returns {Promise<Object>} - Saved attendance record with PDF URL
   */
  async saveAttendanceRecord(sessionData, facultyData) {
    try {
      // Create a new attendance record
      const attendanceRecord = new AttendanceRecord({
        facultyId: facultyData.facultyId,
        facultyName: facultyData.name,
        facultyEmail: facultyData.email,
        department: sessionData.department,
        semester: sessionData.semester,
        section: sessionData.section,
        totalStudents: sessionData.totalStudents,
        presentCount: sessionData.presentStudents.length,
        absentees: sessionData.absentees,
        presentStudents: sessionData.presentStudents,
        sessionType: sessionData.sessionType || 'roll',
        date: new Date()
      });

      // Save the record to get an ID
      await attendanceRecord.save();
      
      return attendanceRecord;
    } catch (error) {
      console.error('Error saving attendance record:', error);
      throw new Error(`Failed to save attendance record: ${error.message}`);
    }
  }

  /**
   * Generate and upload PDF for an attendance record
   * @param {string} recordId - ID of the attendance record
   * @returns {Promise<Object>} - Updated attendance record with PDF URL
   */
  async generateAndUploadPDF(recordId) {
    try {
      // Find the attendance record
      const record = await AttendanceRecord.findById(recordId);
      if (!record) {
        throw new Error('Attendance record not found');
      }

      // Check if PDF already exists
      if (record.pdfUrl) {
        return record;
      }

      // Prepare session data for PDF generation
      const sessionData = {
        department: record.department,
        semester: record.semester,
        section: record.section,
        totalStudents: record.totalStudents,
        presentStudents: record.presentStudents,
        absentees: record.absentees,
        date: record.date,
        sessionType: record.sessionType
      };

      // Prepare faculty data for PDF generation
      const facultyData = {
        name: record.facultyName,
        email: record.facultyEmail
      };

      // Generate PDF using existing report service
      const pdfPath = await reportService.generateAttendanceReport(sessionData, facultyData);

      // Format date for filename
      const formattedDate = new Date(record.date).toISOString().split('T')[0];
      
      try {
        // Try to upload to Cloudinary first
        const result = await cloudinary.uploader.upload(pdfPath, {
          folder: `attendance_reports/${record.facultyId}`,
          public_id: `faculty_${record.facultyId}_${record.department}_${record.section}_${formattedDate}`,
          resource_type: 'raw'
        });
        
        // Update record with Cloudinary PDF URL
        record.pdfUrl = result.secure_url;
        record.cloudinaryPublicId = result.public_id;
      } catch (cloudinaryError) {
        console.error('Error uploading to Cloudinary:', cloudinaryError);
        
        // Fallback to local storage if Cloudinary fails
        const publicDir = path.join(__dirname, '../../public');
        const pdfDir = path.join(publicDir, 'attendance_reports');
        
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir);
        }
        
        if (!fs.existsSync(pdfDir)) {
          fs.mkdirSync(pdfDir);
        }
        
        // Create faculty directory if it doesn't exist
        const facultyDir = path.join(pdfDir, record.facultyId);
        if (!fs.existsSync(facultyDir)) {
          fs.mkdirSync(facultyDir);
        }
        
        // Create a unique filename
        const filename = `faculty_${record.facultyId}_${record.department}_${record.section}_${formattedDate}_${Date.now()}.pdf`;
        const destinationPath = path.join(facultyDir, filename);
        
        // Copy the file
        fs.copyFileSync(pdfPath, destinationPath);
        
        // Create a URL for the file
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        record.pdfUrl = `${baseUrl}/attendance_reports/${record.facultyId}/${filename}`;
      }
      
      // Update download count and save record
      record.downloadCount = 1;
      await record.save();

      // Clean up temporary file
      reportService.cleanupTempFile(pdfPath);

      return record;
    } catch (error) {
      console.error('Error generating and uploading PDF:', error);
      throw new Error(`Failed to generate and upload PDF: ${error.message}`);
    }
  }

  /**
   * Get attendance records for a faculty
   * @param {string} facultyId - Faculty ID
   * @param {Object} filters - Optional filters (date, department, section)
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} - Array of attendance records
   */
  async getFacultyAttendanceRecords(facultyId, filters = {}, limit = 30) {
    try {
      // Build query
      const query = { facultyId };
      
      // Add date filter if provided
      if (filters.date) {
        const startDate = new Date(filters.date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(filters.date);
        endDate.setHours(23, 59, 59, 999);
        
        query.date = { $gte: startDate, $lte: endDate };
      }
      
      // Add department filter if provided
      if (filters.department) {
        query.department = filters.department;
      }
      
      // Add section filter if provided
      if (filters.section) {
        query.section = filters.section;
      }
      
      // Execute query
      const records = await AttendanceRecord.find(query)
        .sort({ date: -1 })
        .limit(limit);
      
      return records;
    } catch (error) {
      console.error('Error getting faculty attendance records:', error);
      throw new Error(`Failed to get faculty attendance records: ${error.message}`);
    }
  }

  /**
   * Get a single attendance record by ID
   * @param {string} recordId - Record ID
   * @returns {Promise<Object>} - Attendance record
   */
  async getAttendanceRecord(recordId) {
    try {
      const record = await AttendanceRecord.findById(recordId);
      if (!record) {
        throw new Error('Attendance record not found');
      }
      return record;
    } catch (error) {
      console.error('Error getting attendance record:', error);
      throw new Error(`Failed to get attendance record: ${error.message}`);
    }
  }

  /**
   * Increment download count for an attendance record
   * @param {string} recordId - Record ID
   * @returns {Promise<Object>} - Updated attendance record
   */
  async incrementDownloadCount(recordId) {
    try {
      const record = await AttendanceRecord.findByIdAndUpdate(
        recordId,
        { $inc: { downloadCount: 1 } },
        { new: true }
      );
      
      if (!record) {
        throw new Error('Attendance record not found');
      }
      
      return record;
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw new Error(`Failed to increment download count: ${error.message}`);
    }
  }

  /**
   * Get attendance records for a specific faculty
   * @param {string} facultyId - ID of the faculty
   * @param {Object} filters - Optional filters for department, section, date
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} - List of attendance records
   */
  async getFacultyAttendanceRecords(facultyId, filters = {}, limit = 30) {
    try {
      // Build query object
      const query = { facultyId };
      
      // Add optional filters
      if (filters.department) query.department = filters.department;
      if (filters.section) query.section = filters.section;
      if (filters.date) {
        const date = new Date(filters.date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        query.date = {
          $gte: date,
          $lt: nextDay
        };
      }
      
      // Find records with query and limit
      const records = await AttendanceRecord.find(query)
        .sort({ date: -1 })
        .limit(limit);
      
      return records;
    } catch (error) {
      console.error('Error fetching faculty attendance records:', error);
      throw new Error(`Failed to fetch attendance records: ${error.message}`);
    }
  }

  /**
   * Get a specific attendance record by ID
   * @param {string} recordId - ID of the attendance record
   * @returns {Promise<Object>} - Attendance record
   */
  async getAttendanceRecord(recordId) {
    try {
      const record = await AttendanceRecord.findById(recordId);
      return record;
    } catch (error) {
      console.error('Error fetching attendance record:', error);
      throw new Error(`Failed to fetch attendance record: ${error.message}`);
    }
  }

  /**
   * Update an existing attendance record
   * @param {string} recordId - ID of the attendance record to update
   * @param {Object} updateData - Data to update (presentStudents, absentees, presentCount)
   * @returns {Promise<Object>} - Updated attendance record
   */
  async updateAttendanceRecord(recordId, updateData) {
    try {
      // Validate the update data
      const { presentStudents, absentees, presentCount } = updateData;
      
      if (!Array.isArray(presentStudents) || !Array.isArray(absentees)) {
        throw new Error('Present students and absentees must be arrays');
      }
      
      // Check for duplicate roll numbers between present and absent lists
      const duplicates = presentStudents.filter(roll => absentees.includes(roll));
      if (duplicates.length > 0) {
        throw new Error(`Roll numbers cannot be in both present and absent lists: ${duplicates.join(', ')}`);
      }
      
      // Update the record
      const updatedRecord = await AttendanceRecord.findByIdAndUpdate(
        recordId,
        {
          $set: {
            presentStudents,
            absentees,
            presentCount: presentCount || presentStudents.length
          }
        },
        { new: true } // Return the updated document
      );
      
      if (!updatedRecord) {
        throw new Error('Attendance record not found');
      }
      
      // If the record has a PDF, we should invalidate it since the data has changed
      if (updatedRecord.pdfUrl) {
        // Set pdfUrl to null to indicate it needs regeneration
        updatedRecord.pdfUrl = null;
        updatedRecord.cloudinaryPublicId = null;
        await updatedRecord.save();
        
        // Optionally, we could regenerate the PDF here, but that might be better
        // done on-demand when the user requests it
      }
      
      return updatedRecord;
    } catch (error) {
      console.error('Error updating attendance record:', error);
      throw new Error(`Failed to update attendance record: ${error.message}`);
    }
  }
}

module.exports = new AttendanceRecordService();