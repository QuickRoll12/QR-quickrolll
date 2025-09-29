const mongoose = require('mongoose');

const sessionJoinSchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        required: true, 
        index: true 
    },
    studentId: { 
        type: String, 
        required: true, 
        index: true 
    },
    studentName: { 
        type: String, 
        required: true 
    },
    rollNumber: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true 
    },
    joinedAt: { 
        type: Date, 
        default: Date.now,
        index: true
    },
    deviceInfo: {
        fingerprint: { type: String },
        webRTCIPs: [String],
        userAgent: String,
        ipAddress: String
    },
    // Additional fields for optimization
    department: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true }
}, {
    timestamps: true
});

// Compound indexes for optimal query performance
sessionJoinSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
sessionJoinSchema.index({ sessionId: 1, joinedAt: 1 });
sessionJoinSchema.index({ department: 1, semester: 1, section: 1 });

// Instance methods for compatibility
sessionJoinSchema.statics.countBySession = function(sessionId) {
    return this.countDocuments({ sessionId });
};

sessionJoinSchema.statics.findBySession = function(sessionId, limit = 100) {
    return this.find({ sessionId })
        .select('studentId studentName rollNumber email joinedAt')
        .sort({ joinedAt: 1 })
        .limit(limit);
};

sessionJoinSchema.statics.hasStudentJoined = function(sessionId, studentId) {
    return this.exists({ sessionId, studentId });
};

module.exports = mongoose.model('SessionJoin', sessionJoinSchema);
