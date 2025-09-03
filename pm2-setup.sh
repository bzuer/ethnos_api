#!/bin/bash

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

APP_NAME="ethnos-api"
CURRENT_DIR=$(pwd)
if ! command -v pm2 &> /dev/null; then
    log "PM2 not found. Installing PM2..."
    npm install -g pm2
    
    if ! command -v pm2 &> /dev/null; then
        error "Failed to install PM2. Please install manually: npm install -g pm2"
        exit 1
    fi
fi

log "PM2 version: $(pm2 --version)"

log "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ethnos-api',
    script: 'src/app.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    log_file: 'logs/pm2-combined.log',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,
    
    health_check_grace_period: 30000,
    health_check_fatal_exceptions: true,
    
    node_args: '--max-old-space-size=2048',
    source_map_support: false,
    
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads',
      '*.log',
      '*.pid'
    ],
    
    instance_var: 'INSTANCE_ID',
    increment_var: 'PORT',
    wait_ready: true,
    shutdown_with_message: true,
  }]
};
EOF

if pm2 list | grep -q "$APP_NAME"; then
    log "Stopping existing PM2 process..."
    pm2 stop "$APP_NAME" || true
    pm2 delete "$APP_NAME" || true
fi

mkdir -p logs
log "Starting $APP_NAME with PM2..."
pm2 start ecosystem.config.js

log "Saving PM2 configuration..."
pm2 save

log "Setting up PM2 startup script..."

if pm2 startup 2>/dev/null | grep -q "sudo"; then
    STARTUP_CMD=$(pm2 startup 2>/dev/null | grep "sudo" | head -n 1)
    log "PM2 startup configuration detected."
    warning "To enable auto-start on system reboot, run the following command:"
    echo ""
    echo "  $STARTUP_CMD"
    echo ""
    warning "Then run: pm2 save"
    echo ""
else
    log "PM2 startup script already configured or not needed"
fi

log "Current PM2 status:"
pm2 status

sleep 5
log "Testing application..."
if curl -s http://localhost:3000/health > /dev/null; then
    log "✅ Application is responding correctly"
else
    error "❌ Application is not responding"
    pm2 logs "$APP_NAME" --lines 10
    exit 1
fi

log "PM2 setup completed!"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status                 - Show all running processes"
echo "  pm2 logs $APP_NAME         - Show logs"
echo "  pm2 logs $APP_NAME --lines 100 - Show last 100 lines"
echo "  pm2 restart $APP_NAME      - Restart application"
echo "  pm2 reload $APP_NAME       - Graceful reload"
echo "  pm2 stop $APP_NAME         - Stop application"
echo "  pm2 start $APP_NAME        - Start application"
echo "  pm2 delete $APP_NAME       - Remove from PM2"
echo "  pm2 monit                  - Monitor in real-time"
echo "  pm2 flush                  - Clear logs"
echo "  pm2 save                   - Save current configuration"
echo ""
echo "Log files location:"
echo "  $CURRENT_DIR/logs/pm2-combined.log"
echo "  $CURRENT_DIR/logs/pm2-error.log"
echo "  $CURRENT_DIR/logs/pm2-output.log"