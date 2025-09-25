const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  query: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  relevantDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatbotDocument'
  }],
  metadata: {
    type: Map,
    of: String
  }
});

module.exports = mongoose.model('ChatLog', chatLogSchema);