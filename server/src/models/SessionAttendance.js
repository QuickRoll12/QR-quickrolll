const mongoose = require('mongoose');

const sessionAttendanceSchema = new mongoose.Schema({
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
    markedAt: { 
        type: Date, 
        default: Date.now,
        index: true
    },
    qrToken: { 
        type: String, 
        required: true 
    },
    deviceInfo: {
        fingerprint: { type: String },
        webRTCIPs: [String],
        userAgent: String,
        ipAddress: String
    },
    photoFilename: String,
    photoCloudinaryUrl: String,
    verificationStatus: { 
        type: String, 
        enum: ['pending', 'verified', 'rejected'],
        default: 'verified' 
    },
    // Additional fields for optimization
    department: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true }
}, {
    timestamps: true
});

// Compound indexes for optimal query performance
sessionAttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
sessionAttendanceSchema.index({ sessionId: 1, markedAt: 1 });
sessionAttendanceSchema.index({ department: 1, semester: 1, section: 1 });
sessionAttendanceSchema.index({ verificationStatus: 1, sessionId: 1 });

// Static methods for optimization
sessionAttendanceSchema.statics.countBySession = function(sessionId) {
    return this.countDocuments({ sessionId });
};

sessionAttendanceSchema.statics.findBySession = function(sessionId, limit = 100) {
    return this.find({ sessionId })
        .select('studentId studentName rollNumber email markedAt verificationStatus')
        .sort({ markedAt: 1 })
        .limit(limit);
};

sessionAttendanceSchema.statics.hasStudentMarkedAttendance = function(sessionId, studentId) {
    return this.exists({ sessionId, studentId });
};

sessionAttendanceSchema.statics.getSessionStats = function(sessionId) {
    return this.aggregate([
        { $match: { sessionId } },
        {
            $group: {
                _id: null,
                totalPresent: { $sum: 1 },
                verifiedCount: { 
                    $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] } 
                },
                rollNumbers: { $push: '$rollNumber' }
            }
        }
    ]);
};

module.exports = mongoose.model('SessionAttendance', sessionAttendanceSchema);
