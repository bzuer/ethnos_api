#!/bin/bash

LOG_DIR="/home/server/api_v2/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/sphinx-reindex-$(date +%Y%m%d-%H%M%S).log"
LOCKFILE="/tmp/sphinx-reindex.lock"
ERROR_COUNT=0
SPHINX_CONFIG="/etc/sphinxsearch/sphinx.conf"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_lock() {
    if [ -f "$LOCKFILE" ]; then
        PID=$(cat "$LOCKFILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log_message "ERROR: Another indexing process is running (PID: $PID)"
            exit 1
        else
            log_message "WARNING: Removing stale lock file"
            rm -f "$LOCKFILE"
        fi
    fi
    echo $$ > "$LOCKFILE"
}

remove_lock() {
    rm -f "$LOCKFILE"
}

trap remove_lock EXIT

log_message "========================================="
log_message "Starting Sphinx full reindex process"
log_message "========================================="

check_lock

if ! pgrep -x "searchd" > /dev/null; then
    log_message "WARNING: Searchd is not running. Please start it manually with: ./scripts/sphinx-start.sh start"
fi

log_message "Using --all flag to rebuild all indexes at once"
log_message "----------------------------------------"

START_TIME=$(date +%s)

if indexer --config "$SPHINX_CONFIG" --all --rotate >> "$LOG_FILE" 2>&1; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    log_message "SUCCESS: All indexes rebuilt in ${DURATION} seconds"
else
    ERROR_COUNT=$((ERROR_COUNT + 1))
    log_message "ERROR: Failed to rebuild indexes (see log for details)"
fi

log_message "----------------------------------------"
log_message "Verifying index status..."

INDEXES=(
    "works_poc"
    "persons_poc"
    "organizations_poc"
    "venues_metrics_poc"
)

for INDEX in "${INDEXES[@]}"; do
    COUNT=$(MYSQL_TCP_PORT=9306 mysql -h127.0.0.1 --protocol=tcp --skip-ssl -e "SELECT COUNT(*) FROM $INDEX" 2>/dev/null | tail -1)
    if [ -n "$COUNT" ] && [ "$COUNT" -gt 0 ]; then
        log_message "✓ $INDEX: $COUNT records"
    else
        log_message "✗ $INDEX: Failed to verify or 0 records"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
done

log_message "----------------------------------------"

if [ "$ERROR_COUNT" -eq 0 ]; then
    log_message "Full reindex completed successfully at $(date '+%H:%M:%S')"
    
    find "$LOG_DIR" -name "sphinx-reindex-*.log" -mtime +7 -delete
    log_message "Old log files cleaned up (kept last 7 days)"
else
    log_message "Reindex completed with $ERROR_COUNT errors"
    
    if command -v mail >/dev/null 2>&1; then
        echo "Sphinx reindex completed with $ERROR_COUNT errors. Check $LOG_FILE for details." | \
        mail -s "Sphinx Reindex Alert" root
    fi
fi

log_message "========================================="
log_message "Sphinx reindex process finished"
log_message "========================================="

exit $ERROR_COUNT