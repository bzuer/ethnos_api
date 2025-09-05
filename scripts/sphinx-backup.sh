#!/bin/bash

set -e

BACKUP_DIR="/home/server/api_v2/backup/sphinx"
INDEX_DIR="/var/lib/sphinx"
DATE=$(date +%Y%m%d_%H%M%S)

echo "=== Sphinx Backup Started at $(date) ==="

mkdir -p "$BACKUP_DIR"

BACKUP_PATH="$BACKUP_DIR/sphinx_$DATE"
mkdir -p "$BACKUP_PATH"

echo "Copying index files..."
sudo rsync -av --exclude='*.lock' --exclude='*.tmp.*' --exclude='*.kill' \
    --exclude='*.meta' --exclude='*.ram' \
    "$INDEX_DIR/" "$BACKUP_PATH/"

sudo chown -R server:server "$BACKUP_PATH"

echo "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "sphinx_indexes_$DATE.tar.gz" "sphinx_$DATE"

rm -rf "sphinx_$DATE"

echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "sphinx_indexes_*.tar.gz" -mtime +7 -delete

BACKUP_SIZE=$(du -sh "sphinx_indexes_$DATE.tar.gz" | cut -f1)

echo "✅ Backup completed: sphinx_indexes_$DATE.tar.gz ($BACKUP_SIZE)"
echo "Backup location: $BACKUP_DIR/sphinx_indexes_$DATE.tar.gz"

echo "$(date): sphinx_indexes_$DATE.tar.gz ($BACKUP_SIZE)" >> "$BACKUP_DIR/backup.log"

echo "=== Backup Complete ==="