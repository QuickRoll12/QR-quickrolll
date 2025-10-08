# Redis + Cluster Mode Deployment Guide

## Overview
This guide will help you deploy the Redis cache and cluster mode optimizations to your AWS Lightsail server running on port 3000.

## What We've Implemented

### 1. Redis Shared Cache
- **Device ID caching**: Shared across all workers
- **Session data caching**: Consistent session state
- **Graceful fallback**: Works without Redis (degrades to DB calls)
- **Automatic TTL**: 5-minute cache expiry

### 2. Fixed Timer Duplication
- **QR refresh**: Only master process (every 5 seconds)
- **Token cleanup**: Only master process (every 30 seconds)
- **Photo cleanup**: Only master process (every 6 hours)
- **Cache cleanup**: Only master process (every 6 minutes)

### 3. Health Monitoring
- **Status endpoint**: `/api/status` shows cluster and Redis status
- **Redis fallback**: Automatic degradation if Redis fails

## Deployment Steps

### Step 1: Stop Current Service
```bash
# SSH into your Lightsail server
ssh bitnami@your-server-ip

# Navigate to project directory
cd ~/QR-quickrolll/server

# Stop current PM2 processes
pm2 stop all
pm2 delete all
pm2 list  # Should show empty
```

### Step 2: Pull Latest Code
```bash
# Pull your latest changes
git pull origin main

# Install new Redis dependency
npm install

# Verify Redis package installed
npm list redis
```

### Step 3: Install Redis Server
```bash
# Update system packages
sudo apt update

# Install Redis server
sudo apt install redis-server -y

# Enable Redis to start on boot
sudo systemctl enable redis-server

# Start Redis service
sudo systemctl start redis-server

# Check Redis status
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping
# Should return: PONG
```

### Step 4: Configure Redis (Optional Security)
```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Find and modify these lines:
# bind 127.0.0.1 ::1  (ensure only localhost access)
# requirepass your-password  (uncomment and set password if needed)

# Restart Redis after config changes
sudo systemctl restart redis-server
```

### Step 5: Test Single Instance First
```bash
# Test regular single instance mode
npm run dev

# In another terminal, test the status endpoint
curl http://localhost:3000/api/status

# Should show:
# {
#   "status": "online",
#   "cluster": { "isWorker": false, "workerId": "master" },
#   "redis": { "connected": true, "fallbackMode": false, "healthy": true }
# }

# Stop the test
# Press Ctrl+C
```

### Step 6: Test Cluster Mode
```bash
# Test cluster mode
npm run dev:cluster

# Expected output:
# 🚀 Master 12345 starting cluster mode
# 📊 Available CPUs: 2
# 🔧 Forking 2 worker processes...
# 🌐 Cluster master listening on port 3000
# ✅ Worker 12346 is online
# ✅ Worker 12347 is online
# ✅ Connected to Redis cache
# 🧹 QR Token cleanup scheduled (master process only)
# 🧹 QR Session cache cleanup scheduled (master process only)

# Test status endpoint from another terminal
curl http://localhost:3000/api/status

# Test multiple times to see different workers responding
curl http://localhost:3000/api/status
curl http://localhost:3000/api/status
curl http://localhost:3000/api/status

# Stop the test
# Press Ctrl+C
```

### Step 7: Deploy with PM2
```bash
# Start cluster mode with PM2
pm2 start ecosystem.config.js --only qr-quickroll-cluster

# Check PM2 status
pm2 status

# Monitor logs
pm2 logs qr-quickroll-cluster

# Monitor system resources
pm2 monit
```

### Step 8: Verify Deployment
```bash
# Check if all services are running
pm2 list

# Test API endpoints
curl http://localhost:3000/api/status
curl http://localhost:3000/

# Check Redis is working
redis-cli info memory
redis-cli dbsize

# Monitor logs for any errors
pm2 logs qr-quickroll-cluster --lines 50
```

### Step 9: Performance Testing
```bash
# Test with a small attendance session (10-20 students)
# Monitor CPU usage: htop
# Monitor Redis: redis-cli monitor
# Check PM2 metrics: pm2 monit

# Look for these success indicators:
# - QR refresh messages appear only once every 5 seconds
# - Cache hit messages in logs
# - No "duplicate" or "already exists" errors
# - CPU usage distributed across both cores
```

## Monitoring Commands

### Check Redis Status
```bash
# Redis connection
redis-cli ping

# Redis memory usage
redis-cli info memory

# Number of keys in cache
redis-cli dbsize

# Monitor Redis operations in real-time
redis-cli monitor
```

### Check Application Status
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs qr-quickroll-cluster

# System resources
htop

# API health check
curl http://localhost:3000/api/status | jq
```

### Performance Metrics
```bash
# Check cache hit rate (look in application logs)
pm2 logs qr-quickroll-cluster | grep "Cache"

# Monitor QR refresh (should be every 5 seconds, not 2.5)
pm2 logs qr-quickroll-cluster | grep "QR refresh"

# Check worker distribution
pm2 logs qr-quickroll-cluster | grep "Worker"
```

## Troubleshooting

### If Redis Fails to Start
```bash
# Check Redis logs
sudo journalctl -u redis-server

# Check if port 6379 is in use
sudo netstat -tlnp | grep 6379

# Restart Redis
sudo systemctl restart redis-server
```

### If Cluster Mode Has Issues
```bash
# Fallback to single instance
pm2 stop qr-quickroll-cluster
pm2 start ecosystem.config.js --only qr-quickroll-single

# Check for port conflicts
sudo netstat -tlnp | grep 3000
```

### If Cache Not Working
```bash
# Check Redis connection in app logs
pm2 logs qr-quickroll-cluster | grep "Redis"

# The app will work without Redis (fallback mode)
# Look for "fallback mode" messages in logs
```

## Rollback Plan

If anything goes wrong:

```bash
# Stop cluster mode
pm2 stop qr-quickroll-cluster
pm2 delete qr-quickroll-cluster

# Start single instance mode
pm2 start src/app.js --name "qr-quickroll-single"

# Or use ecosystem config
pm2 start ecosystem.config.js --only qr-quickroll-single
```

## Expected Performance Improvements

### Before (Single Instance)
- CPU usage: 4.53% on 1 core
- Cache hit rate: ~90% (single process)
- QR refresh: Every 5 seconds
- Capacity: ~600-800 students

### After (Cluster + Redis)
- CPU usage: ~2.3% per core (distributed)
- Cache hit rate: ~90% (shared across workers)
- QR refresh: Every 5 seconds (no duplication)
- Capacity: ~1,200-1,600 students

## Success Indicators

✅ **Redis working**: Status endpoint shows `redis.healthy: true`
✅ **Cluster working**: Status endpoint shows different `workerId` on multiple requests
✅ **No timer duplication**: QR refresh logs appear every 5 seconds (not 2.5)
✅ **Cache working**: Logs show "Cache hit" messages
✅ **Performance improved**: CPU usage distributed across both cores

## Support

If you encounter issues:
1. Check the logs: `pm2 logs qr-quickroll-cluster`
2. Verify Redis: `redis-cli ping`
3. Check status: `curl http://localhost:3000/api/status`
4. Rollback if needed using the rollback plan above

The system is designed to be fault-tolerant - if Redis fails, the application continues working with database queries instead of cache.
