#!/bin/bash

SCRIPT_PATH="/home/server/api_v2/scripts/sphinx-full-reindex.sh"
CRON_TIME="0 5 * * *"
CRON_COMMENT="# Daily Sphinx full reindex at 5:00 AM"

echo "Installing Sphinx reindex cron job..."

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "ERROR: Reindex script not found at $SCRIPT_PATH"
    exit 1
fi

if ! [ -x "$SCRIPT_PATH" ]; then
    echo "Making script executable..."
    chmod +x "$SCRIPT_PATH"
fi

EXISTING_CRON=$(crontab -l 2>/dev/null | grep -F "$SCRIPT_PATH")

if [ -n "$EXISTING_CRON" ]; then
    echo "Removing existing Sphinx reindex cron job..."
    (crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH") | crontab -
fi

(crontab -l 2>/dev/null; echo "$CRON_COMMENT"; echo "$CRON_TIME $SCRIPT_PATH >> /var/log/sphinxsearch/cron.log 2>&1") | crontab -

if [ $? -eq 0 ]; then
    echo "✓ Cron job installed successfully"
    echo "  Schedule: Daily at 5:00 AM"
    echo "  Script: $SCRIPT_PATH"
    echo "  Logs: /var/log/sphinxsearch/reindex-*.log"
    echo ""
    echo "Current crontab:"
    crontab -l | grep -A1 "Sphinx"
else
    echo "ERROR: Failed to install cron job"
    exit 1
fi

echo ""
echo "To manually test the reindex script, run:"
echo "  $SCRIPT_PATH"
echo ""
echo "To monitor the cron execution, check:"
echo "  tail -f /var/log/sphinxsearch/cron.log"