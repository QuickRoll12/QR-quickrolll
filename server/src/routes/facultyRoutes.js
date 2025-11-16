const express = require('express');
const router = express.Router();
const ProxyMarker = require('../models/ProxyMarker');
const CameraViolation = require('../models/CameraViolation');
const auth = require('../middleware/auth');

// Get suspicious activity data
router.get('/suspicious-activity', auth, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ message: 'Access denied. Faculty only.' });
        }

        // Get both VPN violations (ProxyMarker) and Camera violations
        const [proxyMarkers, cameraViolations] = await Promise.all([
            ProxyMarker.find()
                .sort({ timestamp: -1 })
                .limit(50),
            CameraViolation.find()
                .sort({ timestamp: -1 })
                .limit(50)
        ]);

        // Combine both types of violations
        const allViolations = [
            ...proxyMarkers.map(marker => ({
                ...marker.toObject(),
                violationType: 'VPN_USAGE',
                reason: `VPN usage detected from ${marker.country}`
            })),
            ...cameraViolations.map(violation => ({
                ...violation.toObject(),
                violationType: 'CAMERA_MONITORING',
                course: null, // Not available in camera violations
                ipAddress: null, // Not available in camera violations
                country: null // Not available in camera violations
            }))
        ];

        // Sort by timestamp and limit
        const sortedViolations = allViolations
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        res.json(sortedViolations);
    } catch (error) {
        console.error('Error fetching suspicious activity:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;