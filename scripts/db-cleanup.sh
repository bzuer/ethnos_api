#!/bin/bash

# Database Cleanup - Safe database connection management  
# Replaces: cleanup-connections.sh (removes hardcoded credentials)
# Version: 1.0
# Created: 2025-09-05

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$API_DIR/logs/db-cleanup.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1"
    echo -e "${RED}$message${NC}" >&2
    echo "$message" >> "$LOG_FILE"
}

warning() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Load environment variables
load_env() {
    if [ -f "$API_DIR/.env" ]; then
        # Load environment variables safely (no export of sensitive data to subprocesses)
        set -a
        source "$API_DIR/.env"
        set +a
        log "Environment variables loaded"
    else
        error "Environment file not found: $API_DIR/.env"
        return 1
    fi
}

# Kill hanging Node.js processes safely
cleanup_processes() {
    log "Checking for hanging Node.js processes..."
    
    local processes=$(pgrep -f "node.*app\.js" || true)
    
    if [ -n "$processes" ]; then
        warning "Found hanging Node.js processes: $processes"
        
        # Graceful shutdown first
        echo "$processes" | xargs -r kill -TERM
        sleep 5
        
        # Force kill any remaining processes
        local remaining=$(pgrep -f "node.*app\.js" || true)
        if [ -n "$remaining" ]; then
            warning "Force killing remaining processes: $remaining"
            echo "$remaining" | xargs -r kill -KILL
        fi
        
        log "Node.js processes cleaned up"
    else
        log "No hanging Node.js processes found"
    fi
}

# Clean up database connections safely using environment variables
cleanup_connections() {
    log "Cleaning up database connections..."
    
    # Validate required environment variables
    if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
        error "Missing required database environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)"
        return 1
    fi
    
    # Create temporary MySQL config file for security
    local mysql_config=$(mktemp)
    cat > "$mysql_config" <<EOF
[client]
host=${DB_HOST}
port=${DB_PORT:-3306}
user=${DB_USER}
password=${DB_PASSWORD}
database=${DB_NAME}
EOF
    
    # Find sleeping connections
    local kill_file=$(mktemp)
    
    if mysql --defaults-file="$mysql_config" -e "
        SELECT CONCAT('KILL CONNECTION ', id, ';') as kill_query 
        FROM information_schema.PROCESSLIST 
        WHERE USER = '${DB_USER}' AND Command = 'Sleep' AND Time > 10
    " > "$kill_file" 2>/dev/null; then
        
        # Count connections to kill
        local connection_count=$(grep -c "KILL CONNECTION" "$kill_file" || echo "0")
        
        if [ "$connection_count" -gt 0 ]; then
            warning "Found $connection_count sleeping connections to clean up"
            
            # Execute kill commands
            if mysql --defaults-file="$mysql_config" < "$kill_file" 2>/dev/null; then
                log "Successfully cleaned up $connection_count sleeping connections"
            else
                warning "Some connections could not be killed (may have already closed)"
            fi
        else
            log "No sleeping connections found to clean up"
        fi
    else
        warning "Could not query database connections - database might be busy"
    fi
    
    # Clean up temporary files securely
    rm -f "$mysql_config" "$kill_file"
}

# Clean up Redis connections if available
cleanup_redis() {
    if command -v redis-cli >/dev/null 2>&1; then
        log "Checking Redis connections..."
        
        if redis-cli ping >/dev/null 2>&1; then
            local client_count=$(redis-cli CLIENT LIST | wc -l)
            log "Redis active connections: $client_count"
            
            # Only flush if there are too many idle connections
            if [ "$client_count" -gt 50 ]; then
                warning "High Redis connection count, cleaning up idle connections"
                redis-cli CLIENT LIST | grep "idle=[5-9][0-9][0-9]\|idle=[0-9][0-9][0-9][0-9]" | cut -d' ' -f2 | cut -d'=' -f2 | xargs -r redis-cli CLIENT KILL ID
                log "Cleaned up idle Redis connections"
            fi
        else
            log "Redis not available for cleanup"
        fi
    else
        log "Redis CLI not available, skipping Redis cleanup"
    fi
}

# Show status
show_status() {
    load_env || exit 1
    log "Current system status:"
    
    # Show Node.js processes
    node_processes=$(pgrep -f "node.*app\.js" || echo "0")
    if [ "$node_processes" != "0" ]; then
        echo "Node.js processes: $(echo "$node_processes" | wc -l)"
    else
        echo "Node.js processes: 0"
    fi
    
    # Show database connections
    if command -v mysql >/dev/null 2>&1; then
        mysql_config=$(mktemp)
        cat > "$mysql_config" <<EOF
[client]
host=${DB_HOST}
port=${DB_PORT:-3306}
user=${DB_USER}
password=${DB_PASSWORD}
database=${DB_NAME}
EOF
        db_connections=$(mysql --defaults-file="$mysql_config" -e "SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE USER = '${DB_USER}'" 2>/dev/null | tail -1 || echo "0")
        echo "Database connections: $db_connections"
        rm -f "$mysql_config"
    fi
    
    # Show Redis connections
    if command -v redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
        redis_connections=$(redis-cli CLIENT LIST | wc -l)
        echo "Redis connections: $redis_connections"
    fi
}

# Main cleanup function
main() {
    log "Starting database cleanup process..."
    
    if ! load_env; then
        exit 1
    fi
    
    cleanup_processes
    cleanup_connections
    cleanup_redis
    
    log "Database cleanup completed successfully"
}

# Show usage
usage() {
    cat << EOF
Database Cleanup - Safe Database Connection Management

Usage: $0 [command]

Commands:
    cleanup     Perform full cleanup (default)
    processes   Clean up hanging Node.js processes only
    connections Clean up database connections only
    redis       Clean up Redis connections only
    status      Show current connection status

Examples:
    $0              # Full cleanup
    $0 processes    # Clean processes only
    $0 status       # Show connection status

Environment Requirements:
    - DB_HOST: Database host
    - DB_USER: Database username  
    - DB_PASSWORD: Database password
    - DB_NAME: Database name
    - DB_PORT: Database port (optional, defaults to 3306)

Log File: $LOG_FILE

EOF
}

# Handle command line arguments
case "${1:-cleanup}" in
    cleanup)
        main
        ;;
    processes)
        cleanup_processes
        ;;
    connections)
        load_env && cleanup_connections
        ;;
    redis)
        cleanup_redis
        ;;
    status)
        show_status
        ;;
    --help|help)
        usage
        ;;
    *)
        usage
        exit 1
        ;;
esac

exit $?