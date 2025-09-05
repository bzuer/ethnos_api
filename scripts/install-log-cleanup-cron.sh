#!/bin/bash

set -e
SCRIPT_PATH="/home/server/api_v2/scripts/log-cleanup.sh"
CRON_SCHEDULE="0 2 * * *"
LOG_FILE="/home/server/api_v2/logs/cleanup.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${RED}Error: Log cleanup script not found at $SCRIPT_PATH${NC}"
    exit 1
fi

# Make sure script is executable
chmod +x "$SCRIPT_PATH"

# Create cron job entry
CRON_JOB="$CRON_SCHEDULE $SCRIPT_PATH >> $LOG_FILE 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$SCRIPT_PATH"; then
    echo -e "${YELLOW}Cron job for log cleanup already exists${NC}"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo -e "${GREEN}✓ Cron job installed successfully${NC}"
    echo -e "Schedule: Daily at 2:00 AM"
    echo -e "Script: $SCRIPT_PATH"
    echo -e "Log: $LOG_FILE"
fi

# Display current crontab
echo -e "\n${GREEN}Current cron jobs:${NC}"
crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" || echo "No cron jobs found"