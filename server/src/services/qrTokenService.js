const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class QRTokenService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        this.tokenCache = new Map(); // In-memory cache for active tokens
    }

    /**
     * Generate a secure QR token for a session
     * @param {Object} sessionData - Session information
     * @returns {Object} - Token and expiry information
     */
    generateQRToken(sessionData) {
        const { sessionId, facultyId, department, semester, section } = sessionData;
        
        // Create a unique token with timestamp
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(16).toString('hex');
        
        // Create optimized JWT payload - only essential data
        const payload = {
            sid: sessionId,        // Shortened: sessionId
            ts: timestamp,         // Shortened: timestamp  
            t: 'qr'               // Shortened: type
            // Removed: facultyId, department, semester, section (can be fetched from session)
            // Removed: random (timestamp + sessionId provides uniqueness)
        };

        // Generate JWT token with 7-second expiry (5s frontend + 2s buffer)
        const token = jwt.sign(payload, this.jwtSecret, { 
            expiresIn: '7s',
            issuer: 'quickroll-qr',
            audience: 'quickroll-students'
        });

        // Calculate expiry time
        const expiryTime = new Date(timestamp + 7000); // 7 seconds from now

        // Store in cache for quick validation
        this.tokenCache.set(token, {
            sessionId,           // Keep original sessionId for cache lookup
            timestamp,
            expiryTime,
            used: false
        });

        // Clean up expired tokens from cache
        this.cleanupExpiredTokens();

        return {
            token,
            expiryTime,
            validitySeconds: 7,
            frontendTimer: 5 // What to show in frontend
        };
    }

    /**
     * Validate a QR token (handles both single and group tokens)
     * @param {string} token - The QR token to validate
     * @param {Object} studentData - Student information (required for group tokens)
     * @returns {Object} - Validation result
     */
    async validateQRToken(token, studentData = null) {
        try {
            // First check cache for quick validation
            const cachedToken = this.tokenCache.get(token);
            
            if (!cachedToken) {
                return {
                    valid: false,
                    error: 'Token not found or expired',
                    code: 'TOKEN_NOT_FOUND'
                };
            }

            // Check expiry
            if (new Date() > cachedToken.expiryTime) {
                this.tokenCache.delete(token);
                return {
                    valid: false,
                    error: 'QR code expired',
                    code: 'TOKEN_EXPIRED'
                };
            }

            // Verify JWT signature
            const decoded = jwt.verify(token, this.jwtSecret, {
                issuer: 'quickroll-qr',
                audience: 'quickroll-students'
            });

            // Handle group tokens (optimized structure)
            if (decoded.t === 'grp') {
                if (!studentData) {
                    return {
                        valid: false,
                        error: 'Student data required for group token validation',
                        code: 'STUDENT_DATA_REQUIRED'
                    };
                }
                return await this.validateGroupQRToken(token, studentData);
            }

            // Handle single session tokens (optimized structure)
            if (decoded.t !== 'qr') {
                return {
                    valid: false,
                    error: 'Invalid token type',
                    code: 'INVALID_TOKEN_TYPE'
                };
            }

            return {
                valid: true,
                isGroupToken: false,
                sessionData: {
                    sessionId: decoded.sid,      // Use optimized field name
                    timestamp: decoded.ts        // Use optimized field name
                    // Other session data will be fetched from database during attendance marking
                },
                tokenInfo: cachedToken
            };

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return {
                    valid: false,
                    error: 'QR code expired',
                    code: 'TOKEN_EXPIRED'
                };
            } else if (error.name === 'JsonWebTokenError') {
                return {
                    valid: false,
                    error: 'Invalid QR code',
                    code: 'INVALID_TOKEN'
                };
            } else {
                console.error('QR Token validation error:', error);
                return {
                    valid: false,
                    error: 'Token validation failed',
                    code: 'VALIDATION_ERROR'
                };
            }
        }
    }

    /**
     * Mark a token as used to prevent reuse
     * @param {string} token - The token to mark as used
     */
    markTokenAsUsed(token) {
        const cachedToken = this.tokenCache.get(token);
        if (cachedToken) {
            cachedToken.used = true;
            this.tokenCache.set(token, cachedToken);
        }
    }

    /**
     * Invalidate a specific token
     * @param {string} token - The token to invalidate
     */
    invalidateToken(token) {
        this.tokenCache.delete(token);
    }

    /**
     * Invalidate all tokens for a session
     * @param {string} sessionId - The session ID
     */
    invalidateSessionTokens(sessionId) {
        for (const [token, tokenData] of this.tokenCache.entries()) {
            if (tokenData.sessionId === sessionId) {
                this.tokenCache.delete(token);
            }
        }
    }

    /**
     * Clean up expired tokens from cache
     */
    cleanupExpiredTokens() {
        const now = new Date();
        for (const [token, tokenData] of this.tokenCache.entries()) {
            if (now > tokenData.expiryTime) {
                this.tokenCache.delete(token);
            }
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        const now = new Date();
        let activeTokens = 0;
        let expiredTokens = 0;
        let usedTokens = 0;

        for (const [token, tokenData] of this.tokenCache.entries()) {
            if (now > tokenData.expiryTime) {
                expiredTokens++;
            } else if (tokenData.used) {
                usedTokens++;
            } else {
                activeTokens++;
            }
        }

        return {
            totalTokens: this.tokenCache.size,
            activeTokens,
            expiredTokens,
            usedTokens
        };
    }

    /**
     * Generate a group QR token for multiple sections
     * @param {Object} groupData - Group session information
     * @returns {Object} - Token and expiry information
     */
    generateGroupQRToken(groupData) {
        const { groupSessionId, facultyId, sections } = groupData;
        
        // Create a unique token with timestamp
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(16).toString('hex');
        
        // Create optimized JWT payload for group session - only essential data
        const payload = {
            gid: groupSessionId,   // Shortened: groupSessionId
            ts: timestamp,         // Shortened: timestamp
            t: 'grp'              // Shortened: type
            // Removed: facultyId (can be fetched from group session)
            // Removed: sections array (can be fetched from group session during validation)
            // Removed: random (timestamp + groupSessionId provides uniqueness)
        };

        // Generate JWT token with 7-second expiry (5s frontend + 2s buffer)
        const token = jwt.sign(payload, this.jwtSecret, { 
            expiresIn: '7s',
            issuer: 'quickroll-qr',
            audience: 'quickroll-students'
        });

        // Calculate expiry time
        const expiryTime = new Date(timestamp + 7000); // 7 seconds from now

        // Store in cache for quick validation
        this.tokenCache.set(token, {
            groupSessionId,      // Keep original groupSessionId for cache lookup
            timestamp,
            expiryTime,
            used: false,
            isGroupToken: true
        });

        // Clean up expired tokens from cache
        this.cleanupExpiredTokens();

        return {
            token,
            expiryTime,
            validitySeconds: 7,
            frontendTimer: 5 // What to show in frontend
        };
    }

    /**
     * Validate a group QR token and determine which section the student belongs to
     * @param {string} token - The QR token to validate
     * @param {Object} studentData - Student information to match section
     * @returns {Object} - Validation result with matched section
     */
    async validateGroupQRToken(token, studentData) {
        try {
            // First check cache for quick validation
            const cachedToken = this.tokenCache.get(token);
            
            if (!cachedToken) {
                return {
                    valid: false,
                    error: 'Token not found or expired',
                    code: 'TOKEN_NOT_FOUND'
                };
            }

            // Check if it's a group token
            if (!cachedToken.isGroupToken) {
                return {
                    valid: false,
                    error: 'Not a group token',
                    code: 'INVALID_TOKEN_TYPE'
                };
            }

            // Check expiry
            if (new Date() > cachedToken.expiryTime) {
                this.tokenCache.delete(token);
                return {
                    valid: false,
                    error: 'QR code expired',
                    code: 'TOKEN_EXPIRED'
                };
            }

            // Verify JWT signature
            const decoded = jwt.verify(token, this.jwtSecret, {
                issuer: 'quickroll-qr',
                audience: 'quickroll-students'
            });

            // Additional validation for optimized token structure
            if (decoded.t !== 'grp') {
                return {
                    valid: false,
                    error: 'Invalid token type',
                    code: 'INVALID_TOKEN_TYPE'
                };
            }

            // Fetch group session from database to get sections
            const GroupSession = require('../models/GroupSession');
            const groupSession = await GroupSession.findByGroupSessionId(decoded.gid);
            
            if (!groupSession) {
                return {
                    valid: false,
                    error: 'Group session not found',
                    code: 'GROUP_SESSION_NOT_FOUND'
                };
            }

            // Find the section that matches the student from database
            const matchedSection = groupSession.sections.find(section => 
                section.department === studentData.course &&
                section.semester === studentData.semester &&
                section.section === studentData.section
            );

            if (!matchedSection) {
                return {
                    valid: false,
                    error: 'You are not enrolled in any section of this group session',
                    code: 'SECTION_NOT_FOUND'
                };
            }

            return {
                valid: true,
                isGroupToken: true,
                groupSessionId: decoded.gid,        // Use optimized field name
                sessionData: {
                    sessionId: matchedSection.sessionId,
                    department: matchedSection.department,
                    semester: matchedSection.semester,
                    section: matchedSection.section,
                    timestamp: decoded.ts           // Use optimized field name
                    // facultyId can be fetched from group session if needed
                },
                allSections: groupSession.sections, // Use database data instead of token data
                tokenInfo: cachedToken
            };

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return {
                    valid: false,
                    error: 'QR code expired',
                    code: 'TOKEN_EXPIRED'
                };
            } else if (error.name === 'JsonWebTokenError') {
                return {
                    valid: false,
                    error: 'Invalid QR code',
                    code: 'INVALID_TOKEN'
                };
            } else {
                console.error('Group QR Token validation error:', error);
                return {
                    valid: false,
                    error: 'Token validation failed',
                    code: 'VALIDATION_ERROR'
                };
            }
        }
    }

    /**
     * Generate a simple numeric code for display (optional)
     * @returns {string} - 6-digit numeric code
     */
    generateDisplayCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Create QR data string that includes both token and display info
     * @param {Object} tokenData - Token generation result
     * @param {string} displayCode - Optional display code
     * @returns {string} - QR code data string
     */
    createQRData(tokenData, displayCode = null) {
        const qrData = {
            token: tokenData.token,
            expires: tokenData.expiryTime.getTime(),
            code: displayCode || this.generateDisplayCode(),
            version: '1.0'
        };

        // Return as JSON string for QR code
        return JSON.stringify(qrData);
    }

    /**
     * Parse QR data string
     * @param {string} qrDataString - QR code data string
     * @returns {Object} - Parsed QR data
     */
    parseQRData(qrDataString) {
        try {
            const qrData = JSON.parse(qrDataString);
            
            // Validate required fields
            if (!qrData.token || !qrData.expires) {
                throw new Error('Invalid QR data format');
            }

            return {
                valid: true,
                token: qrData.token,
                expires: new Date(qrData.expires),
                code: qrData.code,
                version: qrData.version || '1.0'
            };
        } catch (error) {
            return {
                valid: false,
                error: 'Invalid QR code format'
            };
        }
    }
}

// Create singleton instance
const qrTokenService = new QRTokenService();

// Cleanup expired tokens every 30 seconds - Only master process
const cluster = require('cluster');
if (!cluster.isWorker) {
    setInterval(() => {
        qrTokenService.cleanupExpiredTokens();
    }, 30000);
    console.log('🧹 QR Token cleanup scheduled (master process only)');
}

module.exports = qrTokenService;
