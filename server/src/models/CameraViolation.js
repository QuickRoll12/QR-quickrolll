const mongoose = require('mongoose');

const cameraViolationSchema = new mongoose.Schema({
    // Basic student information
    name: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    classRollNumber: {
        type: String,
        required: true
    },
    
    // Violation details
    reason: {
        type: String,
        required: true,
        default: 'Camera access blocked during attendance monitoring'
    },
    
    // Timestamp in Indian format
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    // Auto-expire after 2 days
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        index: { expireAfterSeconds: 0 }
    }
});

// Index for efficient querying
cameraViolationSchema.index({ timestamp: -1 });

module.exports = mongoose.model('CameraViolation', cameraViolationSchema);
