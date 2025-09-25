const DeviceSession = require('../models/DeviceSession');

class DeviceTrackingService {
    constructor() {
        this.deviceCooldownMinutes = 15;
        this.maxUsersPerDevice = 1;
    }

    /**
     * Check if a device is allowed to mark attendance
     * @param {Object} deviceData - Device identification data
     * @param {String} deviceData.fingerprint - Browser fingerprint
     * @param {Array} deviceData.webRTCIPs - WebRTC IP addresses
     * @param {String} deviceData.ipAddress - Current IP address
     * @param {Object} userData - User data
     * @param {String} userData.userId - User ID
     * @param {String} userData.userName - User name
     * @param {String} userData.userRoll - User roll number
     * @param {Object} sessionData - Session data
     * @returns {Promise<Object>} - Result with allowed status and reason
     */

    async canMarkAttendance(deviceData, userData, sessionData) {
        const { fingerprint, webRTCIPs, ipAddress } = deviceData;
        const { userId } = userData;

        if (!fingerprint || !webRTCIPs || !ipAddress || !userId) {
            return { allowed: false, reason: 'Missing device or user identification data' };
        }

        const cooldownTime = new Date(Date.now() - this.deviceCooldownMinutes * 60000);
        const oneDayAgo = new Date(Date.now() - 86400000);

        const [recentSessions, daySessions] = await Promise.all([
            DeviceSession.find({
                $or: [{ fingerprint }, { webRTCIPs: { $in: webRTCIPs } }, { ipAddress }],
                createdAt: { $gte: cooldownTime }
            }).sort({ createdAt: -1 }),
            DeviceSession.find({
                $or: [{ fingerprint }, { webRTCIPs: { $in: webRTCIPs } }],
                createdAt: { $gte: oneDayAgo }
            })
        ]);

        const uniqueSessions = Array.from(new Set(recentSessions.map(s => s._id.toString())))
            .map(id => recentSessions.find(s => s._id.toString() === id));

        const differentUserSessions = uniqueSessions.filter(s => s.lastUserId !== userId);
        if (differentUserSessions.length) {
            const mostRecent = differentUserSessions[0];
            const minutesAgo = Math.floor((Date.now() - mostRecent.createdAt.getTime()) / 60000);
            return {
                allowed: false,
                reason: `Device used by ${mostRecent.lastUserName || 'another user'} ${minutesAgo} min ago. Wait ${this.deviceCooldownMinutes - minutesAgo} min.`
            };
        }

        const deviceUsers = new Set(daySessions.map(s => s.lastUserId));
        deviceUsers.delete(userId);
        if (deviceUsers.size >= this.maxUsersPerDevice) {
            return { allowed: false, reason: 'Device has been used by multiple users today. Attendance restricted.' };
        }

        await this.recordDeviceSession(deviceData, userData, sessionData);
        return { allowed: true, reason: 'Device verification passed' };
    }

    /**
     * Record a new device session
     * @param {Object} deviceData - Device identification data
     * @param {Object} userData - User data
     * @param {Object} sessionData - Session data
     */
    async recordDeviceSession(deviceData, userData, sessionData) {
        await DeviceSession.create({
            ...deviceData,
            lastUserId: userData.userId,
            lastUserName: userData.userName,
            lastUserRoll: userData.userRoll,
            ...sessionData,
            userHistory: [{ userId: userData.userId, userName: userData.userName, timestamp: new Date() }]
        });
    }

    /**
     * Get suspicious device activity for admin review
     * @returns {Promise<Array>} - List of suspicious devices
    */
    async getSuspiciousActivity() {
        return DeviceSession.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 86400000) } } },
            { $group: { _id: '$fingerprint', userCount: { $addToSet: '$lastUserId' }, sessions: { $push: '$$ROOT' } } },
            { $match: { 'userCount.1': { $exists: true } } },
            { $sort: { userCount: -1 } }
        ]);
    }

    /**
     * Clear device tracking records for a specific session
     * @param {Object} sessionData - Session data
     * @param {String} sessionData.department - Department
     * @param {String} sessionData.semester - Semester
     * @param {String} sessionData.section - Section
     * @returns {Promise<Object>} - Result with success status
    */

    async clearSessionRecords(sessionData) {
        try {
            await DeviceSession.deleteMany(sessionData);
            return { success: true, message: `Cleared records for ${JSON.stringify(sessionData)}` };
        } catch (error) {
            return { success: false, message: 'Error clearing records', error: error.message };
        }
    }
}

module.exports = new DeviceTrackingService();