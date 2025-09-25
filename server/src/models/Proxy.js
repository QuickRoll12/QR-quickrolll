const mongoose = require('mongoose');

const proxySchema = new mongoose.Schema({
    fingerprint: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    department: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    rollNumber: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
        expires: 900 // Documents automatically expire after 15 minutes (900 seconds)
    },
    deviceInfo: {
        type: String,
        required: true
    }
});

// Create an index on fingerprint and timestamp for quick lookups
proxySchema.index({ fingerprint: 1, timestamp: 1 });
proxySchema.index({ userId: 1, timestamp: 1 });

module.exports = mongoose.model('Proxy', proxySchema);