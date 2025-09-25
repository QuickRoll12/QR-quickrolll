/**
 * Service for cleaning up old data from the database
 */
const FacultyRequest = require('../models/facultyRequest');
const AttendanceRecord = require('../models/AttendanceRecord');

/**
 * Deletes faculty requests that have been processed (approved or rejected) more than 24 hours ago
 */
async function cleanupProcessedFacultyRequests() {
  try {
    // Calculate the date 24 hours ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find and delete faculty requests that were processed more than 24 hours ago
    const result = await FacultyRequest.deleteMany({
      processedAt: { $lt: oneDayAgo },
      status: { $in: ['approved', 'rejected'] }
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} processed faculty requests older than 24 hours`);
    }
  } catch (error) {
    console.error('Error cleaning up processed faculty requests:', error);
  }
}

/**
 * Checks for duplicate attendance records and removes them
 */
async function cleanupDuplicateAttendanceRecords() {
  try {
    // Get all attendance records
    const records = await AttendanceRecord.find({});
    
    // Create a map to track unique session identifiers
    const sessionMap = new Map();
    const duplicateIds = [];
    
    // Identify duplicates (keeping the most recent one for each session)
    records.forEach(record => {
      const sessionKey = `${record.department}-${record.semester}-${record.section}-${record.date}`;
      
      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, record);
      } else {
        // If we already have a record for this session, keep the newer one
        const existingRecord = sessionMap.get(sessionKey);
        if (record.createdAt > existingRecord.createdAt) {
          duplicateIds.push(existingRecord._id);
          sessionMap.set(sessionKey, record);
        } else {
          duplicateIds.push(record._id);
        }
      }
    });
    
    // Delete the duplicates
    if (duplicateIds.length > 0) {
      const result = await AttendanceRecord.deleteMany({ _id: { $in: duplicateIds } });
      console.log(`Cleaned up ${result.deletedCount} duplicate attendance records`);
    }
  } catch (error) {
    console.error('Error cleaning up duplicate attendance records:', error);
  }
}

/**
 * Run all cleanup tasks
 */
async function runCleanupTasks() {
  await cleanupProcessedFacultyRequests();
  await cleanupDuplicateAttendanceRecords();
}

module.exports = {
  cleanupProcessedFacultyRequests,
  cleanupDuplicateAttendanceRecords,
  runCleanupTasks
};