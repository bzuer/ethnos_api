#!/bin/bash

# Sphinx Queue Cleanup - Clean old completed entries using environment variables
# Replaces hardcoded credential cron job
# Version: 1.0
# Created: 2025-09-05

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$API_DIR/logs/sphinx-queue-cleanup.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log_message() {
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Load environment variables
load_env() {
    if [ -f "$API_DIR/.env" ]; then
        set -a
        source "$API_DIR/.env"
        set +a
        log_message "Environment variables loaded"
    else
        log_message "ERROR: Environment file not found: $API_DIR/.env"
        return 1
    fi
}

# Clean up old sphinx queue entries
cleanup_sphinx_queue() {
    log_message "Starting Sphinx queue cleanup..."
    
    # Validate required environment variables
    if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
        log_message "ERROR: Missing required database environment variables"
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
    
    # Clean up completed entries older than 7 days
    local cleanup_query="DELETE FROM sphinx_queue WHERE status='completed' AND processed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)"
    
    if mysql --defaults-file="$mysql_config" -e "$cleanup_query" 2>/dev/null; then
        # Get count of remaining entries
        local remaining_count=$(mysql --defaults-file="$mysql_config" -e "SELECT COUNT(*) FROM sphinx_queue" 2>/dev/null | tail -1)
        log_message "SUCCESS: Cleaned up old sphinx queue entries. Remaining entries: $remaining_count"
    else
        log_message "ERROR: Failed to clean up sphinx queue entries"
        rm -f "$mysql_config"
        return 1
    fi
    
    # Clean up temporary files securely
    rm -f "$mysql_config"
    
    log_message "Sphinx queue cleanup completed"
    return 0
}

# Show current queue status
show_status() {
    load_env || exit 1
    
    local mysql_config=$(mktemp)
    cat > "$mysql_config" <<EOF
[client]
host=${DB_HOST}
port=${DB_PORT:-3306}
user=${DB_USER}
password=${DB_PASSWORD}
database=${DB_NAME}
EOF
    
    echo "=== Sphinx Queue Status ==="
    mysql --defaults-file="$mysql_config" -e "
        SELECT 
            status, 
            COUNT(*) as count,
            MIN(created_at) as oldest_entry,
            MAX(created_at) as newest_entry
        FROM sphinx_queue 
        GROUP BY status
        ORDER BY status
    " 2>/dev/null || echo "Failed to retrieve queue status"
    
    rm -f "$mysql_config"
}

# Show usage
usage() {
    cat << EOF
Sphinx Queue Cleanup - Clean Old Queue Entries

Usage: $0 [command]

Commands:
    cleanup     Clean up old completed entries (default)
    status      Show current queue status

Examples:
    $0              # Clean up old entries
    $0 status       # Show queue status

Environment Requirements:
    - DB_HOST: Database host
    - DB_USER: Database username  
    - DB_PASSWORD: Database password
    - DB_NAME: Database name
    - DB_PORT: Database port (optional, defaults to 3306)

Log File: $LOG_FILE

EOF
}

# Main execution
case "${1:-cleanup}" in
    cleanup)
        load_env && cleanup_sphinx_queue
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