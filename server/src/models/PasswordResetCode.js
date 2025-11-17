const mongoose = require('mongoose');

const passwordResetCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5 // Maximum 5 verification attempts
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Automatically expire documents after 10 minutes
  }
});

// Index for faster queries
passwordResetCodeSchema.index({ email: 1, createdAt: -1 });

const PasswordResetCode = mongoose.model('PasswordResetCode', passwordResetCodeSchema);
module.exports = PasswordResetCode;