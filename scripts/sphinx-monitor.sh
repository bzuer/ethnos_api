#!/bin/bash

set -e

SCRIPT_DIR="$(dirname "$0")"
API_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$API_DIR/logs/sphinx-monitor.log"

mkdir -p $(dirname "$LOG_FILE")

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

check_sphinx_via_api() {
    response=$(curl -s --max-time 10 "localhost:3000/search/sphinx/status" 2>/dev/null)
    if echo "$response" | grep -q '"connected":true'; then
        return 0
    else
        return 1
    fi
}

check_sphinx_process() {
    if pgrep -f "searchd.*sphinx-poc.conf" > /dev/null; then
        return 0
    else
        return 1
    fi
}

start_sphinx() {
    log_message "Starting Sphinx daemon..."
    
    cd "$API_DIR"
    nohup searchd --config sphinx-poc.conf --console > logs/sphinx-daemon.log 2>&1 &
    
    sleep 5
    
    if check_sphinx_process; then
        log_message "✓ Sphinx started successfully"
        return 0
    else
        log_message "✗ Failed to start Sphinx"
        return 1
    fi
}

main() {
    log_message "Sphinx monitor check started"
    
    # First check if process is running
    if ! check_sphinx_process; then
        log_message "Sphinx process not found, attempting to start..."
        start_sphinx
        exit $?
    fi
    
    # Then check if it's accessible via API
    if ! check_sphinx_via_api; then
        log_message "Sphinx not accessible via API, restarting..."
        
        # Kill existing processes
        pkill -f "searchd.*sphinx-poc.conf"
        sleep 2
        
        start_sphinx
        exit $?
    fi
    
    log_message "✓ Sphinx is running and accessible"
    exit 0
}

main