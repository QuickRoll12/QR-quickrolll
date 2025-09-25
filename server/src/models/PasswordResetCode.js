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
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Automatically expire documents after 5 minutes
  }
});

const PasswordResetCode = mongoose.model('PasswordResetCode', passwordResetCodeSchema);
module.exports = PasswordResetCode;