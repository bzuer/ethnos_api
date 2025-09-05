#!/bin/bash

# Cron Manager - Unified cron job management
# Replaces: install-sphinx-cron.sh, install-log-cleanup-cron.sh, setup-cron.sh
# Version: 1.0
# Created: 2025-09-05

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
API_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[CRON]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        error "This script requires root privileges. Please run with sudo."
        exit 1
    fi
}

# Install all cron jobs
install_all() {
    log "Installing all cron jobs..."
    
    # Remove existing cron jobs first
    remove_all
    
    # Get current crontab
    local temp_cron=$(mktemp)
    crontab -l 2>/dev/null > "$temp_cron" || touch "$temp_cron"
    
    # Add header comment
    echo "" >> "$temp_cron"
    echo "# Ethnos API Automated Jobs - Installed $(date)" >> "$temp_cron"
    
    # 1. Sphinx Full Reindex - Daily at 5:00 AM
    echo "0 5 * * * $SCRIPT_DIR/sphinx-manager.sh reindex >> $API_DIR/logs/sphinx-reindex-cron.log 2>&1" >> "$temp_cron"
    log "Added: Daily Sphinx reindex at 5:00 AM"
    
    # 2. Log Cleanup - Weekly on Sunday at 2:00 AM  
    echo "0 2 * * 0 $SCRIPT_DIR/log-cleanup.sh >> $API_DIR/logs/log-cleanup-cron.log 2>&1" >> "$temp_cron"
    log "Added: Weekly log cleanup on Sunday at 2:00 AM"
    
    # 3. Sphinx Health Check - Every 15 minutes
    echo "*/15 * * * * $SCRIPT_DIR/sphinx-manager.sh health >> $API_DIR/logs/sphinx-health-cron.log 2>&1" >> "$temp_cron"
    log "Added: Sphinx health check every 15 minutes"
    
    # 4. Database Connection Cleanup - Every 6 hours
    echo "0 */6 * * * $SCRIPT_DIR/db-cleanup.sh >> $API_DIR/logs/db-cleanup-cron.log 2>&1" >> "$temp_cron"
    log "Added: Database cleanup every 6 hours"
    
    # Install the new crontab
    crontab "$temp_cron"
    rm -f "$temp_cron"
    
    log "All cron jobs installed successfully!"
    list_jobs
}

# Remove all project-related cron jobs
remove_all() {
    log "Removing existing Ethnos API cron jobs..."
    
    local temp_cron=$(mktemp)
    crontab -l 2>/dev/null > "$temp_cron" || touch "$temp_cron"
    
    # Remove lines containing our script paths
    sed -i "\|$SCRIPT_DIR|d" "$temp_cron"
    sed -i "\|$API_DIR|d" "$temp_cron"
    sed -i "/# Ethnos API Automated Jobs/d" "$temp_cron"
    
    crontab "$temp_cron"
    rm -f "$temp_cron"
    
    log "Existing cron jobs removed"
}

# Install specific job
install_sphinx_reindex() {
    log "Installing Sphinx reindex cron job..."
    
    local temp_cron=$(mktemp)
    crontab -l 2>/dev/null > "$temp_cron" || touch "$temp_cron"
    
    # Remove existing sphinx reindex job
    sed -i "\|sphinx-manager.sh reindex\|d" "$temp_cron"
    
    # Add new job
    echo "0 5 * * * $SCRIPT_DIR/sphinx-manager.sh reindex >> $API_DIR/logs/sphinx-reindex-cron.log 2>&1" >> "$temp_cron"
    
    crontab "$temp_cron"
    rm -f "$temp_cron"
    
    log "Sphinx reindex job installed (daily at 5:00 AM)"
}

install_log_cleanup() {
    log "Installing log cleanup cron job..."
    
    local temp_cron=$(mktemp)
    crontab -l 2>/dev/null > "$temp_cron" || touch "$temp_cron"
    
    # Remove existing log cleanup job
    sed -i "\|log-cleanup.sh\|d" "$temp_cron"
    
    # Add new job
    echo "0 2 * * 0 $SCRIPT_DIR/log-cleanup.sh >> $API_DIR/logs/log-cleanup-cron.log 2>&1" >> "$temp_cron"
    
    crontab "$temp_cron"
    rm -f "$temp_cron"
    
    log "Log cleanup job installed (weekly on Sunday at 2:00 AM)"
}

install_health_check() {
    log "Installing health check cron job..."
    
    local temp_cron=$(mktemp)
    crontab -l 2>/dev/null > "$temp_cron" || touch "$temp_cron"
    
    # Remove existing health check job
    sed -i "\|sphinx-manager.sh health\|d" "$temp_cron"
    
    # Add new job
    echo "*/15 * * * * $SCRIPT_DIR/sphinx-manager.sh health >> $API_DIR/logs/sphinx-health-cron.log 2>&1" >> "$temp_cron"
    
    crontab "$temp_cron"
    rm -f "$temp_cron"
    
    log "Health check job installed (every 15 minutes)"
}

# List current cron jobs
list_jobs() {
    log "Current cron jobs:"
    echo ""
    crontab -l 2>/dev/null | grep -E "$SCRIPT_DIR|$API_DIR" || echo "No Ethnos API cron jobs found"
    echo ""
}

# Validate cron job syntax
validate_jobs() {
    log "Validating cron job syntax..."
    
    local temp_cron=$(mktemp)
    crontab -l 2>/dev/null > "$temp_cron" || touch "$temp_cron"
    
    local error_count=0
    
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*[^#] ]]; then
            # Basic validation - check if line has at least 6 parts (5 time fields + command)
            local field_count=$(echo "$line" | awk '{print NF}')
            if [ "$field_count" -lt 6 ]; then
                error "Invalid cron syntax: $line"
                ((error_count++))
            fi
        fi
    done < "$temp_cron"
    
    rm -f "$temp_cron"
    
    if [ "$error_count" -eq 0 ]; then
        log "All cron jobs have valid syntax"
        return 0
    else
        error "Found $error_count syntax errors in cron jobs"
        return 1
    fi
}

# Show cron job status
status() {
    log "Cron service status:"
    systemctl status cron --no-pager --lines=0
    
    echo ""
    list_jobs
    
    echo ""
    log "Recent cron logs:"
    tail -20 /var/log/cron.log 2>/dev/null | grep -E "$(whoami)|cron" | tail -10 || log "No recent cron logs found"
}

# Show usage
usage() {
    cat << EOF
Cron Manager - Unified Cron Job Management System

Usage: $0 <command> [options]

Commands:
    install         Install all cron jobs
    remove          Remove all project cron jobs
    sphinx          Install only Sphinx reindex job
    logs            Install only log cleanup job  
    health          Install only health check job
    list            List current project cron jobs
    validate        Validate cron job syntax
    status          Show cron service and job status

Examples:
    sudo $0 install        # Install all cron jobs
    sudo $0 sphinx         # Install only Sphinx reindex
    sudo $0 list           # List current jobs
    sudo $0 status         # Show status

Scheduled Jobs:
    - Sphinx reindex: Daily at 5:00 AM
    - Log cleanup: Weekly on Sunday at 2:00 AM  
    - Health check: Every 15 minutes
    - DB cleanup: Every 6 hours

Log Files:
    - Sphinx reindex: $API_DIR/logs/sphinx-reindex-cron.log
    - Log cleanup: $API_DIR/logs/log-cleanup-cron.log
    - Health check: $API_DIR/logs/sphinx-health-cron.log
    - DB cleanup: $API_DIR/logs/db-cleanup-cron.log

EOF
}

# Main command handling
case "${1:-}" in
    install)
        check_permissions
        install_all
        ;;
    remove)
        check_permissions
        remove_all
        ;;
    sphinx)
        check_permissions
        install_sphinx_reindex
        ;;
    logs)
        check_permissions
        install_log_cleanup
        ;;
    health)
        check_permissions
        install_health_check
        ;;
    list)
        list_jobs
        ;;
    validate)
        validate_jobs
        ;;
    status)
        status
        ;;
    *)
        usage
        exit 1
        ;;
esac

exit $?