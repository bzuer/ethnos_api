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

SERVICE_NAME="ethnos-api"
SERVICE_FILE="ethnos-api.service"
SYSTEMD_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
CURRENT_DIR=$(pwd)
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root. Run with regular user and sudo will be used when needed."
    exit 1
fi

if [ ! -f "$SERVICE_FILE" ]; then
    error "Service file $SERVICE_FILE not found in current directory"
    exit 1
fi

log "Installing Ethnos API systemd service..."

if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    log "Stopping existing service..."
    sudo systemctl stop "$SERVICE_NAME"
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    log "Disabling existing service..."
    sudo systemctl disable "$SERVICE_NAME"
fi

log "Installing service file to $SYSTEMD_PATH..."
sudo cp "$SERVICE_FILE" "$SYSTEMD_PATH"

sudo chmod 644 "$SYSTEMD_PATH"

mkdir -p logs

touch logs/systemd.log logs/systemd-error.log
chmod 644 logs/systemd.log logs/systemd-error.log

log "Reloading systemd daemon..."
sudo systemctl daemon-reload

log "Enabling service for automatic startup..."
sudo systemctl enable "$SERVICE_NAME"

log "Testing service configuration..."
sudo systemctl status "$SERVICE_NAME" --no-pager || true

log "Service installation completed!"
echo ""
echo "Available commands:"
echo "  sudo systemctl start $SERVICE_NAME     - Start the API service"
echo "  sudo systemctl stop $SERVICE_NAME      - Stop the API service"
echo "  sudo systemctl restart $SERVICE_NAME   - Restart the API service"
echo "  sudo systemctl status $SERVICE_NAME    - Check service status"
echo "  sudo systemctl enable $SERVICE_NAME    - Enable auto-start (already done)"
echo "  sudo systemctl disable $SERVICE_NAME   - Disable auto-start"
echo "  journalctl -u $SERVICE_NAME -f        - Follow service logs"
echo "  journalctl -u $SERVICE_NAME --since=\"1 hour ago\" - View recent logs"
echo ""
echo "Service logs are also available at:"
echo "  $CURRENT_DIR/logs/systemd.log         - Standard output"
echo "  $CURRENT_DIR/logs/systemd-error.log   - Error output"
echo ""

read -p "Do you want to start the service now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Starting $SERVICE_NAME service..."
    sudo systemctl start "$SERVICE_NAME"
    
    # Wait a moment and check status
    sleep 3
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "Service started successfully!"
        
        # Test API endpoint
        sleep 5
        if curl -s http://localhost:3000/health > /dev/null; then
            log "API is responding correctly at http://localhost:3000"
        else
            warning "API may not be fully ready yet. Check logs with: journalctl -u $SERVICE_NAME -f"
        fi
    else
        error "Service failed to start. Check logs with: journalctl -u $SERVICE_NAME -n 20"
    fi
else
    log "Service installed but not started. Use 'sudo systemctl start $SERVICE_NAME' to start it."
fi

log "Installation complete!"