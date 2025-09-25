const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
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
    required: true 
  },
  section: { 
    type: String, 
    required: true,
    index: true
  },
  date: { 
    type: Date, 
    default: Date.now,
    index: true,
    expires: 60 * 60 * 24 * 30  // Expire documents after 30 days
  },
  totalStudents: { 
    type: Number, 
    required: true 
  },
  presentCount: { 
    type: Number, 
    required: true 
  },
  absentees: [String],
  presentStudents: [String],
  pdfUrl: { 
    type: String 
  },
  cloudinaryPublicId: { 
    type: String 
  },
  downloadCount: { 
    type: Number, 
    default: 0 
  },
  sessionType: { 
    type: String, 
    enum: ['roll', 'gmail'] 
  },
  // Photo verification fields
  photoVerificationRequired: {
    type: Boolean,
    default: true
  },
  studentPhotos: [{
    studentId: String,
    rollNumber: String,
    photoFilename: String,
    photoTimestamp: Date,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  }]
}, {
  timestamps: true
});

// Create compound index for efficient filtering
attendanceRecordSchema.index({ facultyId: 1, date: -1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);