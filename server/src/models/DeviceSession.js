const mongoose = require('mongoose');

const deviceSessionSchema = new mongoose.Schema({
    // Device identifiers
    fingerprint: {
        type: String,
        required: true,
        index: true
    },
    webRTCIPs: [{
        type: String,
        required: true
    }],
    ipAddress: {
        type: String,
        required: true
    },
    
    // Session information
    lastUserId: {
        type: String,
        required: true,
        index: true
    },
    lastUserName: {
        type: String
    },
    lastUserRoll: {
        type: String
    },
    
    // Attendance details
    department: String,
    semester: String,
    section: String,
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
        expires: 900 // 15 minutes in seconds
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
    // Track all users who have used this device
    userHistory: [{
        userId: String,
        userName: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

// Create compound indices for efficient querying
deviceSessionSchema.index({ fingerprint: 1, createdAt: -1 });
deviceSessionSchema.index({ 'webRTCIPs': 1 });
deviceSessionSchema.index({ ipAddress: 1, createdAt: -1 });

module.exports = mongoose.model('DeviceSession', deviceSessionSchema);
