const mongoose = require('mongoose');

const webRTCSessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    webRTCIPs: [{
        type: String,
        required: true
    }],
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 900 // 15 minutes in seconds
    }
});

// Create compound index for efficient querying
webRTCSessionSchema.index({ webRTCIPs: 1, timestamp: 1 });

module.exports = mongoose.model('WebRTCSession', webRTCSessionSchema);
