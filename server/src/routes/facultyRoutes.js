const express = require('express');
const router = express.Router();
const ProxyMarker = require('../models/ProxyMarker');
const auth = require('../middleware/auth');

// Get suspicious activity data
router.get('/suspicious-activity', auth, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ message: 'Access denied. Faculty only.' });
        }

        const suspiciousUsers = await ProxyMarker.find()
            .sort({ timestamp: -1 })
            .limit(100); // Limit to last 100 records

        res.json(suspiciousUsers);
    } catch (error) {
        console.error('Error fetching suspicious activity:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;