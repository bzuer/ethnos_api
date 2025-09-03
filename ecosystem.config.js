module.exports = {
  apps: [{
    name: 'ethnos-api',
    script: 'src/app.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    
    // Restart policy
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Auto restart on crashes
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    
    // Logs
    log_file: 'logs/pm2-combined.log',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Process management
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,
    
    // Health monitoring
    health_check_grace_period: 30000,
    health_check_fatal_exceptions: true,
    
    // Additional settings
    node_args: '--max-old-space-size=2048',
    source_map_support: false,
    
    // Ignore watch
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads',
      '*.log',
      '*.pid'
    ],
    
    // Advanced features
    instance_var: 'INSTANCE_ID',
    increment_var: 'PORT',
    
    // Graceful shutdown
    wait_ready: true,
    shutdown_with_message: true,
  }]
};
