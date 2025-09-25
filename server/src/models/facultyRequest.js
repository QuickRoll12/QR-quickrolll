const mongoose = require('mongoose');

// Define the teaching assignment schema
const TeachingAssignmentSchema = new mongoose.Schema({
  semester: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  }
}, { _id: false });

const FacultyRequestSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  department: { 
    type: String, 
    required: true 
  },
  // Field removed as it's no longer needed
  // New field for teaching assignments with semester-section combinations
  teachingAssignments: {
    type: [TeachingAssignmentSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one teaching assignment must be specified'
    }
  },
  photoUrl: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'partially_approved', 'rejected'], 
    default: 'pending' 
  },
  approvedAssignments: {
    type: [TeachingAssignmentSchema],
    default: []
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  processedAt: {
    type: Date,
    default: null
  },
  // For audit purposes
  processedBy: {
    type: String,
    default: null
  },
  // Expiration date for automatic deletion
  expiresAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('FacultyRequest', FacultyRequestSchema);