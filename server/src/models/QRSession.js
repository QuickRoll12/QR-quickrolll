const mongoose = require('mongoose');

const qrSessionSchema = new mongoose.Schema({
  sessionId: {
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
  department: {
    type: String,
    required: true,
    index: true
  },
  semester: {
    type: String,
    required: true,
    index: true
  },
  section: {
    type: String,
    required: true,
    index: true
  },
  totalStudents: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['created', 'locked', 'active', 'ended'],
    default: 'created',
    index: true
  },
  sessionType: {
    type: String,
    enum: ['roll', 'gmail'],
    default: 'roll'
  },
  // QR Code Management
  currentQRToken: {
    type: String,
    index: true
  },
  qrTokenExpiry: {
    type: Date,
    index: true
  },
  qrRefreshCount: {
    type: Number,
    default: 0
  },
  qrSettings: {
    refreshInterval: {
      type: Number,
      default: 5 // seconds - frontend timer
    },
    tokenValidity: {
      type: Number,
      default: 7 // seconds - backend validity (5 + 2 buffer)
    }
  },
  // Student Management
  studentsJoined: [{
    studentId: {
      type: String,
      required: true
    },
    studentName: String,
    rollNumber: String,
    email: String,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    deviceInfo: {
      fingerprint: String,
      webRTCIPs: [String],
      userAgent: String,
      ipAddress: String
    }
  }],
  studentsPresent: [{
    studentId: {
      type: String,
      required: true
    },
    studentName: String,
    rollNumber: String,
    email: String,
    markedAt: {
      type: Date,
      default: Date.now
    },
    qrToken: String,
    deviceInfo: {
      fingerprint: String,
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
    }
  }],
  // Session Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lockedAt: Date,
  startedAt: Date,
  endedAt: Date,
  // Analytics
  analytics: {
    totalQRScans: {
      type: Number,
      default: 0
    },
    uniqueDevices: {
      type: Number,
      default: 0
    },
    duplicateAttempts: {
      type: Number,
      default: 0
    },
    invalidQRAttempts: {
      type: Number,
      default: 0
    },
    averageJoinTime: Number, // seconds from creation to join
    averageMarkTime: Number  // seconds from start to mark attendance
  },
  // Photo Verification Settings
  photoVerificationRequired: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
qrSessionSchema.index({ facultyId: 1, status: 1 });
qrSessionSchema.index({ department: 1, semester: 1, section: 1, status: 1 });
qrSessionSchema.index({ currentQRToken: 1, qrTokenExpiry: 1 });
qrSessionSchema.index({ createdAt: -1 });

// Instance methods
qrSessionSchema.methods.isActive = function() {
  return this.status === 'active';
};

qrSessionSchema.methods.isLocked = function() {
  return ['locked', 'active', 'ended'].includes(this.status);
};

qrSessionSchema.methods.canJoin = function() {
  return this.status === 'created';
};

qrSessionSchema.methods.canStartAttendance = function() {
  return this.status === 'locked';
};

qrSessionSchema.methods.isQRTokenValid = function() {
  return this.currentQRToken && this.qrTokenExpiry && new Date() < this.qrTokenExpiry;
};

qrSessionSchema.methods.getStudentJoinedById = function(studentId) {
  return this.studentsJoined.find(student => student.studentId === studentId);
};

qrSessionSchema.methods.getStudentPresentById = function(studentId) {
  return this.studentsPresent.find(student => student.studentId === studentId);
};

qrSessionSchema.methods.hasStudentJoined = function(studentId) {
  return this.studentsJoined.some(student => student.studentId === studentId);
};

qrSessionSchema.methods.hasStudentMarkedAttendance = function(studentId) {
  return this.studentsPresent.some(student => student.studentId === studentId);
};

// Static methods
qrSessionSchema.statics.findActiveSessionForSection = function(department, semester, section) {
  return this.findOne({
    department,
    semester,
    section,
    status: { $in: ['created', 'locked', 'active'] }
  });
};

qrSessionSchema.statics.findByQRToken = function(qrToken) {
  return this.findOne({
    currentQRToken: qrToken,
    qrTokenExpiry: { $gt: new Date() },
    status: 'active'
  });
};

qrSessionSchema.statics.getFacultyActiveSessions = function(facultyId) {
  return this.find({
    facultyId,
    status: { $in: ['created', 'locked', 'active'] }
  }).sort({ createdAt: -1 });
};

// Auto-expire QR tokens (cleanup job)
qrSessionSchema.statics.cleanupExpiredTokens = function() {
  return this.updateMany(
    {
      qrTokenExpiry: { $lt: new Date() },
      status: 'active'
    },
    {
      $unset: { currentQRToken: 1, qrTokenExpiry: 1 }
    }
  );
};

// TTL index to auto-delete old sessions after 30 days
qrSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('QRSession', qrSessionSchema);
