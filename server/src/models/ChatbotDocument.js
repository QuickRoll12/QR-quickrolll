const mongoose = require('mongoose');

const chatbotDocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'academics', 'facilities', 'faculty', 'events', 'policies'],
    default: 'general'
  },
  type: {
    type: String,
    enum: ['text', 'pdf', 'docx'],
    default: 'text'
  },
  filename: String,
  originalPath: String,
  vectorized: {
    type: Boolean,
    default: false
  },
  chunkCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ChatbotDocument', chatbotDocumentSchema);