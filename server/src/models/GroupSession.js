const mongoose = require('mongoose');

const groupSessionSchema = new mongoose.Schema({
    groupSessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    facultyId: {
        type: String,
        required: true,
        index: true
    },
    facultyName: {
        type: String,
        required: true
    },
    facultyEmail: {
        type: String,
        required: true
    },
    sections: [{
        department: { type: String, required: true },
        semester: { type: String, required: true },
        section: { type: String, required: true },
        sessionId: { type: String, required: true },
        totalStudents: { type: Number, required: true }
    }],
    status: {
        type: String,
        enum: ['created', 'locked', 'active', 'ended'],
        default: 'created',
        index: true
    },
    currentGroupQRToken: {
        type: String,
        default: null
    },
    qrTokenExpiry: {
        type: Date,
        default: null
    },
    qrRefreshCount: {
        type: Number,
        default: 0
    },
    // Aggregated counters from individual sessions
    totalStudentsAcrossSections: {
        type: Number,
        default: 0
    },
    totalStudentsJoined: {
        type: Number,
        default: 0
    },
    totalStudentsPresent: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    lockedAt: {
        type: Date,
        default: null
    },
    startedAt: {
        type: Date,
        default: null
    },
    endedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient queries
groupSessionSchema.index({ facultyId: 1, status: 1 });
groupSessionSchema.index({ createdAt: -1 });

// Instance methods
groupSessionSchema.methods.canJoin = function() {
    return this.status === 'created';
};

groupSessionSchema.methods.canStartAttendance = function() {
    return this.status === 'locked';
};

groupSessionSchema.methods.isActive = function() {
    return this.status === 'active';
};

groupSessionSchema.methods.isEnded = function() {
    return this.status === 'ended';
};

// Static methods
groupSessionSchema.statics.findActiveGroupSessionsForFaculty = function(facultyId) {
    return this.find({
        facultyId,
        status: { $in: ['created', 'locked', 'active'] }
    }).sort({ createdAt: -1 });
};

groupSessionSchema.statics.findByGroupSessionId = function(groupSessionId) {
    return this.findOne({ groupSessionId });
};

const GroupSession = mongoose.model('GroupSession', groupSessionSchema);

module.exports = GroupSession;
