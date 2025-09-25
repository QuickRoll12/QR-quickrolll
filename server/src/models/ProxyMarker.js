const mongoose = require('mongoose');

const proxyMarkerSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    classRollNumber: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true,
        index: true
    },
    country: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 900 // 15 minutes in seconds
    }
});

// Create compound index for efficient querying
proxyMarkerSchema.index({ userId: 1, ipAddress: 1, timestamp: 1 });

module.exports = mongoose.model('ProxyMarker', proxyMarkerSchema);