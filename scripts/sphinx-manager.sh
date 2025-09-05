#!/bin/bash

# Sphinx Manager - Unified Sphinx management system
# Replaces: sphinx-start.sh, sphinx-monitor.sh, sphinx-full-reindex.sh, sphinx-backup.sh
# Version: 1.0
# Created: 2025-09-05

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$API_DIR/config/sphinx-unified.conf"
PID_FILE="$API_DIR/logs/sphinx.pid"
LOG_FILE="$API_DIR/logs/sphinx-manager.log"
DAEMON_LOG="$API_DIR/logs/sphinx-daemon.log"
BACKUP_DIR="$API_DIR/backup/sphinx"
INDEX_DIR="/var/lib/sphinx"
LOCKFILE="/tmp/sphinx-manager.lock"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$PID_FILE")"
mkdir -p "$BACKUP_DIR"

# Logging function
log_message() {
    local level="$1"
    local message="$2"
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Lock management
acquire_lock() {
    if [ -f "$LOCKFILE" ]; then
        local pid=$(cat "$LOCKFILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_message "ERROR" "Another sphinx-manager process is running (PID: $pid)"
            exit 1
        else
            log_message "WARNING" "Removing stale lock file"
            rm -f "$LOCKFILE"
        fi
    fi
    echo $$ > "$LOCKFILE"
    trap 'rm -f "$LOCKFILE"' EXIT
}

# Check if Sphinx is running
is_sphinx_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            # Clean up stale PID file
            rm -f "$PID_FILE"
        fi
    fi
    
    # Double check by process name
    if pgrep -f "searchd.*$(basename "$CONFIG_FILE")" > /dev/null; then
        return 0
    fi
    
    return 1
}

# Start Sphinx daemon
start_sphinx() {
    log_message "INFO" "Starting Sphinx daemon..."
    
    if is_sphinx_running; then
        log_message "WARNING" "Sphinx is already running"
        return 0
    fi
    
    # Ensure configuration exists
    if [ ! -f "$CONFIG_FILE" ]; then
        log_message "ERROR" "Configuration file not found: $CONFIG_FILE"
        return 1
    fi
    
    # Start daemon
    cd "$API_DIR"
    nohup searchd --config "$CONFIG_FILE" --console > "$DAEMON_LOG" 2>&1 &
    local sphinx_pid=$!
    echo "$sphinx_pid" > "$PID_FILE"
    
    # Wait for startup
    sleep 5
    
    if is_sphinx_running; then
        log_message "SUCCESS" "Sphinx started successfully (PID: $sphinx_pid)"
        return 0
    else
        log_message "ERROR" "Failed to start Sphinx daemon"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Stop Sphinx daemon
stop_sphinx() {
    log_message "INFO" "Stopping Sphinx daemon..."
    
    if ! is_sphinx_running; then
        log_message "WARNING" "Sphinx is not running"
        return 0
    fi
    
    # Graceful shutdown
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        kill -TERM "$pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! ps -p "$pid" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            log_message "WARNING" "Forcing Sphinx shutdown"
            kill -KILL "$pid" 2>/dev/null || true
        fi
        
        rm -f "$PID_FILE"
    fi
    
    # Kill any remaining searchd processes
    pkill -f "searchd.*$(basename "$CONFIG_FILE")" 2>/dev/null || true
    
    log_message "SUCCESS" "Sphinx stopped"
    return 0
}

# Restart Sphinx
restart_sphinx() {
    log_message "INFO" "Restarting Sphinx daemon..."
    stop_sphinx
    sleep 2
    start_sphinx
}

# Get Sphinx status
status_sphinx() {
    if is_sphinx_running; then
        local pid=$(cat "$PID_FILE" 2>/dev/null || echo "unknown")
        echo "Sphinx is running (PID: $pid)"
        
        # Try to get status via API
        if command -v curl >/dev/null 2>&1; then
            local api_status=$(curl -s --max-time 5 "localhost:3000/search/sphinx/status" 2>/dev/null || echo "API unavailable")
            echo "API Status: $api_status"
        fi
        
        return 0
    else
        echo "Sphinx is not running"
        return 1
    fi
}

# Health check with automatic restart
health_check() {
    log_message "INFO" "Performing Sphinx health check..."
    
    local restart_needed=false
    
    # Check if process is running
    if ! is_sphinx_running; then
        log_message "WARNING" "Sphinx process not running"
        restart_needed=true
    else
        # Check API connectivity
        if command -v curl >/dev/null 2>&1; then
            if ! curl -s --max-time 10 "localhost:3000/search/sphinx/status" | grep -q '"connected":true'; then
                log_message "WARNING" "Sphinx API not responding properly"
                restart_needed=true
            fi
        fi
    fi
    
    if [ "$restart_needed" = true ]; then
        log_message "INFO" "Health check failed, restarting Sphinx..."
        restart_sphinx
        return $?
    else
        log_message "SUCCESS" "Sphinx health check passed"
        return 0
    fi
}

# Full reindex all indexes
reindex_sphinx() {
    acquire_lock
    
    log_message "INFO" "Starting full Sphinx reindex..."
    
    if ! is_sphinx_running; then
        log_message "WARNING" "Sphinx is not running, starting it first..."
        start_sphinx || return 1
    fi
    
    local start_time=$(date +%s)
    local error_count=0
    
    # Perform full reindex
    if indexer --config "$CONFIG_FILE" --all --rotate >> "$LOG_FILE" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_message "SUCCESS" "Full reindex completed in ${duration} seconds"
    else
        error_count=$((error_count + 1))
        log_message "ERROR" "Full reindex failed"
    fi
    
    # Verify indexes
    local indexes=("works_poc" "persons_poc" "organizations_poc" "venues_metrics_poc")
    
    for index in "${indexes[@]}"; do
        local count=$(MYSQL_TCP_PORT=9306 mysql -h127.0.0.1 --protocol=tcp --skip-ssl -e "SELECT COUNT(*) FROM $index" 2>/dev/null | tail -1 || echo "0")
        if [ -n "$count" ] && [ "$count" -gt 0 ]; then
            log_message "SUCCESS" "$index: $count records indexed"
        else
            log_message "ERROR" "$index: Failed to verify or 0 records"
            error_count=$((error_count + 1))
        fi
    done
    
    # Clean up old logs
    find "$(dirname "$LOG_FILE")" -name "sphinx-reindex-*.log" -mtime +7 -delete 2>/dev/null || true
    
    if [ "$error_count" -eq 0 ]; then
        log_message "SUCCESS" "Full reindex process completed successfully"
        return 0
    else
        log_message "ERROR" "Reindex completed with $error_count errors"
        return 1
    fi
}

# Backup Sphinx indexes
backup_sphinx() {
    acquire_lock
    
    log_message "INFO" "Starting Sphinx backup..."
    
    local date_stamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/sphinx_$date_stamp"
    
    mkdir -p "$backup_path"
    
    # Copy index files (excluding temporary files)
    if rsync -av --exclude='*.lock' --exclude='*.tmp.*' --exclude='*.kill' \
           --exclude='*.meta' --exclude='*.ram' \
           "$INDEX_DIR/" "$backup_path/" >> "$LOG_FILE" 2>&1; then
        
        # Create compressed archive
        cd "$BACKUP_DIR"
        if tar -czf "sphinx_indexes_$date_stamp.tar.gz" "sphinx_$date_stamp"; then
            rm -rf "sphinx_$date_stamp"
            
            local backup_size=$(du -sh "sphinx_indexes_$date_stamp.tar.gz" | cut -f1)
            log_message "SUCCESS" "Backup completed: sphinx_indexes_$date_stamp.tar.gz ($backup_size)"
            
            # Clean up old backups
            find "$BACKUP_DIR" -name "sphinx_indexes_*.tar.gz" -mtime +7 -delete
            
            echo "$(date): sphinx_indexes_$date_stamp.tar.gz ($backup_size)" >> "$BACKUP_DIR/backup.log"
            return 0
        else
            log_message "ERROR" "Failed to create backup archive"
            rm -rf "sphinx_$date_stamp"
            return 1
        fi
    else
        log_message "ERROR" "Failed to copy index files"
        rm -rf "$backup_path"
        return 1
    fi
}

# Show usage
usage() {
    cat << EOF
Sphinx Manager - Unified Sphinx Management System

Usage: $0 <command> [options]

Commands:
    start       Start Sphinx daemon
    stop        Stop Sphinx daemon  
    restart     Restart Sphinx daemon
    status      Show Sphinx status
    health      Perform health check and auto-restart if needed
    reindex     Perform full reindex of all indexes
    backup      Backup Sphinx indexes
    logs        Show recent log entries

Examples:
    $0 start                # Start Sphinx
    $0 health              # Health check with auto-restart
    $0 reindex             # Full reindex
    $0 backup              # Create backup

Configuration:
    Config file: $CONFIG_FILE
    Log file: $LOG_FILE
    PID file: $PID_FILE
    Index directory: $INDEX_DIR

EOF
}

# Show recent logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "=== Recent Sphinx Manager Logs ==="
        tail -20 "$LOG_FILE"
    fi
    
    if [ -f "$DAEMON_LOG" ]; then
        echo ""
        echo "=== Recent Sphinx Daemon Logs ==="
        tail -20 "$DAEMON_LOG"
    fi
}

# Main command handling
case "${1:-}" in
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
        status_sphinx
        ;;
    health)
        health_check
        ;;
    reindex)
        reindex_sphinx
        ;;
    backup)
        backup_sphinx
        ;;
    logs)
        show_logs
        ;;
    *)
        usage
        exit 1
        ;;
esac

exit $?