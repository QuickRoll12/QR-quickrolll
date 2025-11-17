const mongoose = require('mongoose');

const passwordResetAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  ipAddress: {
    type: String
  },
  attemptType: {
    type: String,
    enum: ['request', 'verify'],
    required: true
  },
  success: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 3600 // Automatically expire documents after 1 hour
  }
});

// Indexes for efficient queries
passwordResetAttemptSchema.index({ email: 1, timestamp: -1 });
passwordResetAttemptSchema.index({ email: 1, attemptType: 1, timestamp: -1 });

const PasswordResetAttempt = mongoose.model('PasswordResetAttempt', passwordResetAttemptSchema);
module.exports = PasswordResetAttempt;
