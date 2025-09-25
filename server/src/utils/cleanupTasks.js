const FacultyRequest = require('../models/facultyRequest');

/**
 * Cleanup task to delete processed faculty requests that have expired
 * This should be run periodically (e.g., every hour via a cron job)
 */
const cleanupProcessedRequests = async () => {
  try {
    const currentDate = new Date();
    
    // Find all processed requests (approved, partially_approved, or rejected) that have expired
    const result = await FacultyRequest.deleteMany({
      status: { $in: ['approved', 'partially_approved', 'rejected'] },
      expiresAt: { $lte: currentDate }
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired faculty requests`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up processed faculty requests:', error);
    throw error;
  }
};

module.exports = {
  cleanupProcessedRequests
};
