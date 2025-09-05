#!/bin/bash

set -e

SPHINX_CONFIG="/home/server/api_v2/sphinx-poc.conf"
SPHINX_PID_FILE="/home/server/api_v2/logs/sphinx.pid"
SPHINX_LOG_FILE="/home/server/api_v2/logs/sphinx.log"
SPHINX_DATA_DIR="/var/lib/sphinx"

is_sphinx_running() {
    if [ -f "$SPHINX_PID_FILE" ]; then
        pid=$(cat "$SPHINX_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

start_sphinx() {
    echo "$(date): Starting Sphinx daemon..."
    
    # Ensure directories exist and have correct permissions
    mkdir -p $(dirname "$SPHINX_LOG_FILE")
    
    # Start Sphinx daemon  
    searchd --config "$SPHINX_CONFIG" > "$SPHINX_LOG_FILE" 2>&1 &
    echo $! > "$SPHINX_PID_FILE"
    
    # Wait a moment for startup
    sleep 3
    
    if is_sphinx_running; then
        echo "$(date): ✓ Sphinx started successfully"
        return 0
    else
        echo "$(date): ✗ Failed to start Sphinx"
        return 1
    fi
}

stop_sphinx() {
    if is_sphinx_running; then
        echo "$(date): Stopping Sphinx daemon..."
        searchd --config "$SPHINX_CONFIG" --stop
        sleep 2
        echo "$(date): ✓ Sphinx stopped"
    fi
}

restart_sphinx() {
    echo "$(date): Restarting Sphinx daemon..."
    stop_sphinx
    start_sphinx
}

maintain_sphinx() {
    if ! is_sphinx_running; then
        echo "$(date): Sphinx is not running, starting..."
        start_sphinx
    else
        echo "$(date): ✓ Sphinx is running (PID: $(cat $SPHINX_PID_FILE))"
    fi
}

update_indexes() {
    echo "$(date): Updating Sphinx indexes..."
    
    # Check if new index files exist
    if [ -f "$SPHINX_DATA_DIR/works_poc.new.sph" ]; then
        echo "$(date): New indexes detected, rotating..."
        
        # Send HUP signal to rotate indexes (Sphinx 2.2.11 compatible)
        pid=$(cat "$SPHINX_PID_FILE")
        kill -HUP $pid
        
        if [ $? -eq 0 ]; then
            echo "$(date): ✓ Indexes rotated successfully"
        else
            echo "$(date): ⚠ Index rotation had warnings (normal)"
        fi
    else
        echo "$(date): No new indexes to rotate"
    fi
}

case "$1" in
    start)
        start_sphinx
        ;;
    stop)
        stop_sphinx
        ;;
    restart)
        restart_sphinx
        ;;
    status)
        if is_sphinx_running; then
            echo "Sphinx is running (PID: $(cat $SPHINX_PID_FILE))"
            exit 0
        else
            echo "Sphinx is not running"
            exit 1
        fi
        ;;
    maintain)
        maintain_sphinx
        update_indexes
        ;;
    update)
        update_indexes
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|maintain|update}"
        echo "  start    - Start Sphinx daemon"
        echo "  stop     - Stop Sphinx daemon"
        echo "  restart  - Restart Sphinx daemon"
        echo "  status   - Check Sphinx status"
        echo "  maintain - Check health and start if needed"
        echo "  update   - Update indexes if new ones available"
        exit 1
        ;;
esac

exit $?