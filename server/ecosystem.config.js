module.exports = {
  apps: [
    {
      name: 'qr-quickroll-single',
      script: 'src/app.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'qr-quickroll-cluster',
      script: 'cluster-app.js',
      instances: 1, // This will spawn 2 workers internally
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/cluster-err.log',
      out_file: './logs/cluster-out.log',
      log_file: './logs/cluster-combined.log',
      time: true,
      // Cluster specific settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      restart_delay: 1000
    }
  ]
};
