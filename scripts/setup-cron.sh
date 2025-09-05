#!/bin/bash

set -e

SCRIPT_DIR="/home/server/api_v2"
USER="server"

echo "=== Setting up Sphinx automation cron jobs ==="

CRON_ENTRIES="
* * * * * cd $SCRIPT_DIR && /usr/bin/node scripts/queue-processor.js >> logs/queue-processor.log 2>&1

30 2 * * * cd $SCRIPT_DIR && ./scripts/sphinx-backup.sh >> logs/backup.log 2>&1

0 3 * * 0 cd $SCRIPT_DIR && echo '51282630' | sudo -S indexer --config sphinx-poc.conf works_poc --rotate >> logs/reindex.log 2>&1

0 4 * * * cd $SCRIPT_DIR && /usr/bin/mariadb -u api_dev -pap1p@ss -D data_db -e \"DELETE FROM sphinx_queue WHERE status='completed' AND processed_at < DATE_SUB(NOW(), INTERVAL 7 DAY)\" >> logs/cleanup.log 2>&1
"

echo "$CRON_ENTRIES" | crontab -

echo "✅ Cron jobs installed successfully:"
echo ""
echo "1. Queue Processor: Every minute"
echo "2. Backup: Daily at 2:30 AM"
echo "3. Full Reindex: Weekly on Sunday at 3:00 AM" 
echo "4. Cleanup: Daily at 4:00 AM"
echo ""
echo "Current crontab:"
crontab -l

echo "=== Cron setup complete ==="