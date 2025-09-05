#!/bin/bash

set -e
LOG_DIR="/home/server/api_v2/logs"
RETENTION_DAYS=7        # Keep logs for 7 days
MAX_LOG_SIZE_MB=100     # Max size for individual log files (MB)
ARCHIVE_THRESHOLD_MB=50 # Compress logs bigger than 50MB

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_message() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cleanup_old_logs() {
    log_message "${GREEN}Cleaning logs older than ${RETENTION_DAYS} days...${NC}"
    
    # Remove compressed logs older than retention period
    find "$LOG_DIR" -name "*.log.gz" -mtime +$RETENTION_DAYS -print0 | while IFS= read -r -d '' file; do
        log_message "${YELLOW}Removing old compressed log: $(basename "$file")${NC}"
        rm "$file"
    done
    
    # Remove uncompressed logs older than retention period (except current day)
    find "$LOG_DIR" -name "*.log" -not -name "*$(date +%Y-%m-%d)*" -mtime +$RETENTION_DAYS -print0 | while IFS= read -r -d '' file; do
        log_message "${YELLOW}Removing old log: $(basename "$file")${NC}"
        rm "$file"
    done
}

compress_large_logs() {
    log_message "${GREEN}Compressing large log files...${NC}"
    
    # Find and compress logs larger than threshold (not from today)
    find "$LOG_DIR" -name "*.log" -not -name "*$(date +%Y-%m-%d)*" -size +${ARCHIVE_THRESHOLD_MB}M -print0 | while IFS= read -r -d '' file; do
        if [ -f "$file" ]; then
            log_message "${YELLOW}Compressing large log: $(basename "$file")${NC}"
            gzip "$file"
        fi
    done
}

check_disk_usage() {
    local usage=$(du -sh "$LOG_DIR" | cut -f1)
    log_message "${GREEN}Current logs directory size: ${usage}${NC}"
}

cleanup_audit_files() {
    log_message "${GREEN}Cleaning old audit files...${NC}"
    
    # Remove audit files older than retention period
    find "$LOG_DIR" -name ".*-audit.json" -mtime +$RETENTION_DAYS -print0 | while IFS= read -r -d '' file; do
        log_message "${YELLOW}Removing old audit file: $(basename "$file")${NC}"
        rm "$file"
    done
}

main() {
    log_message "${GREEN}Starting log cleanup process...${NC}"
    
    # Check if log directory exists
    if [ ! -d "$LOG_DIR" ]; then
        log_message "${RED}Log directory not found: $LOG_DIR${NC}"
        exit 1
    fi
    
    # Display initial disk usage
    check_disk_usage
    
    # Perform cleanup operations
    cleanup_old_logs
    compress_large_logs
    cleanup_audit_files
    
    # Display final disk usage
    check_disk_usage
    
    log_message "${GREEN}Log cleanup completed successfully!${NC}"
}

main "$@"