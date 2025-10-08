const redis = require('redis');

class RedisCache {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.fallbackMode = false;
        this.init();
    }

    async init() {
        try {
            this.client = redis.createClient({
                socket: {
                    host: 'localhost',
                    port: 6379,
                    connectTimeout: 5000,
                    lazyConnect: true
                },
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.warn('⚠️ Redis server not available, falling back to memory cache');
                        this.fallbackMode = true;
                        return false; // Don't retry
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (err) => {
                console.warn('⚠️ Redis Client Error:', err.message);
                this.fallbackMode = true;
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('✅ Connected to Redis cache');
                this.isConnected = true;
                this.fallbackMode = false;
            });

            this.client.on('ready', () => {
                console.log('🚀 Redis cache ready for operations');
            });

            this.client.on('end', () => {
                console.warn('⚠️ Redis connection ended, falling back to memory');
                this.isConnected = false;
                this.fallbackMode = true;
            });

            // Try to connect
            await this.client.connect();
        } catch (error) {
            console.warn('⚠️ Redis initialization failed, using fallback mode:', error.message);
            this.fallbackMode = true;
            this.isConnected = false;
        }
    }

    async get(key) {
        if (this.fallbackMode || !this.isConnected) {
            return null; // Fallback: always cache miss
        }

        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.warn('Redis GET error:', error.message);
            return null; // Graceful degradation
        }
    }

    async set(key, value, ttlSeconds = 300) {
        if (this.fallbackMode || !this.isConnected) {
            return true; // Fallback: pretend success
        }

        try {
            await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Redis SET error:', error.message);
            return true; // Graceful degradation
        }
    }

    async del(key) {
        if (this.fallbackMode || !this.isConnected) {
            return true; // Fallback: pretend success
        }

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.warn('Redis DEL error:', error.message);
            return true; // Graceful degradation
        }
    }

    async exists(key) {
        if (this.fallbackMode || !this.isConnected) {
            return false; // Fallback: always not exists
        }

        try {
            return await this.client.exists(key) === 1;
        } catch (error) {
            console.warn('Redis EXISTS error:', error.message);
            return false; // Graceful degradation
        }
    }

    async flushAll() {
        if (this.fallbackMode || !this.isConnected) {
            return true; // Fallback: pretend success
        }

        try {
            await this.client.flushAll();
            return true;
        } catch (error) {
            console.warn('Redis FLUSHALL error:', error.message);
            return true; // Graceful degradation
        }
    }

    // Health check method
    isHealthy() {
        return this.isConnected && !this.fallbackMode;
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            fallbackMode: this.fallbackMode,
            healthy: this.isHealthy()
        };
    }
}

// Create singleton instance
const redisCache = new RedisCache();

module.exports = redisCache;
