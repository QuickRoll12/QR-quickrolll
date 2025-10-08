const cluster = require('cluster');
const { setupMaster, setupWorker } = require('@socket.io/sticky');
const { createAdapter, setupPrimary } = require('@socket.io/cluster-adapter');

if (cluster.isMaster) {
  console.log(`🚀 Master ${process.pid} starting cluster mode`);
  console.log(`📊 Available CPUs: ${require('os').cpus().length}`);
  
  // Setup master process for sticky sessions
  const httpServer = require('http').createServer();
  setupMaster(httpServer, {
    loadBalancingMethod: 'least-connection', // Better than round-robin for Socket.IO
  });
  
  // Setup primary for cluster adapter
  setupPrimary();
  
  // Fork 2 workers for 2 vCPUs
  console.log('🔧 Forking 2 worker processes...');
  cluster.fork();
  cluster.fork();
  
  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });
  
  // Handle worker online
  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });
  
  // Start listening
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🌐 Cluster master listening on port ${PORT}`);
    console.log(`📈 Ready to handle 2x capacity with ${cluster.workers ? Object.keys(cluster.workers).length : 0} workers`);
  });
  
} else {
  // Worker process - load your existing app
  console.log(`🔧 Worker ${process.pid} starting...`);
  
  // Set environment variable to indicate this is a worker
  process.env.CLUSTER_WORKER = 'true';
  
  // Import your existing app.js
  require('./src/app.js');
  
  console.log(`✅ Worker ${process.pid} ready to handle requests`);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully');
  process.exit(0);
});
