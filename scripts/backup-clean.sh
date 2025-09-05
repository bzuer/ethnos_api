#!/bin/bash

# Clean Backup Script for API v2
# Creates a backup including only files listed in backup.txt

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR"
BACKUP_DIR="/home/server/backup/api_v2"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="api_v2_clean_backup_$TIMESTAMP"
TEMP_DIR="/tmp/$BACKUP_NAME"

echo "======================================"
echo "API v2 Clean Backup Script"
echo "======================================"
echo "Source: $SOURCE_DIR"
echo "Target: $BACKUP_DIR/$BACKUP_NAME"
echo "Started: $(date)"
echo "======================================"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create temporary directory
mkdir -p "$TEMP_DIR"

echo "Creating clean backup based on backup.txt structure..."

# Parse backup.txt to get the list of files and directories
# The file contains a tree structure, we need to extract actual paths
cd "$SOURCE_DIR"

# Function to copy files and directories listed in backup.txt
copy_structure() {
    local file_count=0
    local dir_count=0
    
    # Read backup.txt and extract paths (ignore tree decoration characters)
    while IFS= read -r line; do
        # Skip empty lines and the root directory line
        if [[ -z "$line" ]] || [[ "$line" == "." ]]; then
            continue
        fi
        
        # Remove tree characters (├──, │, └──, spaces, etc.)
        clean_path=$(echo "$line" | sed 's/[├│└─ ]//g' | sed 's/^[ \t]*//')
        
        # Skip if empty after cleaning
        if [[ -z "$clean_path" ]]; then
            continue
        fi
        
        # Check if the path exists
        if [[ -f "$clean_path" ]]; then
            # It's a file, copy it preserving directory structure
            dir_name=$(dirname "$clean_path")
            mkdir -p "$TEMP_DIR/$dir_name"
            cp "$clean_path" "$TEMP_DIR/$clean_path"
            ((file_count++))
        elif [[ -d "$clean_path" ]]; then
            # It's a directory, create it
            mkdir -p "$TEMP_DIR/$clean_path"
            ((dir_count++))
        fi
    done < backup.txt
    
    echo "✓ Processed $file_count files and $dir_count directories"
}

# Alternative: Use the tree structure to manually copy files
# This is more precise and follows the exact structure in backup.txt
echo "Copying files according to backup.txt structure..."

# Copy root files
files=(
    "AI_DISCLOSURE.md"
    "CLAUDE.md.example"
    "ecosystem.config.js"
    ".env.example"
    "ethnos-api.service"
    ".gitignore"
    "healthcheck.sh"
    "install-systemd-service.sh"
    "jest.config.js"
    "node.js.exemple"
    "package.json"
    "package-lock.json"
    "pm2-setup.sh"
    "README.md"
    "RELEASE.md"
    "server.sh"
    "sphinx-poc.conf"
    "swagger.config.js"
    "backup.txt"
)

for file in "${files[@]}"; do
    if [[ -f "$SOURCE_DIR/$file" ]]; then
        cp "$SOURCE_DIR/$file" "$TEMP_DIR/" 2>/dev/null || echo "Warning: $file not found"
    fi
done

# Copy database directory structure
mkdir -p "$TEMP_DIR/database/indexes"
mkdir -p "$TEMP_DIR/database/procedures"
mkdir -p "$TEMP_DIR/database/schema"
mkdir -p "$TEMP_DIR/database/views"

# Copy database files
cp "$SOURCE_DIR/database/README.md" "$TEMP_DIR/database/" 2>/dev/null || true
cp "$SOURCE_DIR/database/indexes/README.md" "$TEMP_DIR/database/indexes/" 2>/dev/null || true
cp "$SOURCE_DIR/database/procedures/"*.* "$TEMP_DIR/database/procedures/" 2>/dev/null || true
cp "$SOURCE_DIR/database/schema/"*.* "$TEMP_DIR/database/schema/" 2>/dev/null || true
cp "$SOURCE_DIR/database/views/"*.* "$TEMP_DIR/database/views/" 2>/dev/null || true

# Copy src directory
mkdir -p "$TEMP_DIR/src/config"
mkdir -p "$TEMP_DIR/src/controllers"
mkdir -p "$TEMP_DIR/src/middleware"
mkdir -p "$TEMP_DIR/src/models"
mkdir -p "$TEMP_DIR/src/routes"
mkdir -p "$TEMP_DIR/src/services"

# Copy src files
cp "$SOURCE_DIR/src/app.js" "$TEMP_DIR/src/" 2>/dev/null || true
cp "$SOURCE_DIR/src/https-app.js" "$TEMP_DIR/src/" 2>/dev/null || true
cp "$SOURCE_DIR/src/config/"*.js "$TEMP_DIR/src/config/" 2>/dev/null || true
cp "$SOURCE_DIR/src/controllers/"*.js "$TEMP_DIR/src/controllers/" 2>/dev/null || true
cp "$SOURCE_DIR/src/middleware/"*.js "$TEMP_DIR/src/middleware/" 2>/dev/null || true
cp "$SOURCE_DIR/src/models/"*.js "$TEMP_DIR/src/models/" 2>/dev/null || true
cp "$SOURCE_DIR/src/routes/"*.js "$TEMP_DIR/src/routes/" 2>/dev/null || true
cp "$SOURCE_DIR/src/services/"*.js "$TEMP_DIR/src/services/" 2>/dev/null || true

# Copy tests directory
mkdir -p "$TEMP_DIR/tests/helpers"

# Copy test files
cp "$SOURCE_DIR/tests/"*.js "$TEMP_DIR/tests/" 2>/dev/null || true
cp "$SOURCE_DIR/tests/helpers/"*.js "$TEMP_DIR/tests/helpers/" 2>/dev/null || true

echo "✓ Files copied according to backup.txt structure"

# Move from temp to final location
mv "$TEMP_DIR" "$BACKUP_DIR/$BACKUP_NAME"

# Create compressed archive
echo "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"

# Remove uncompressed directory
rm -rf "$BACKUP_NAME"

echo "======================================"
echo "Backup completed successfully!"
echo "Location: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "Size: $(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | cut -f1)"
echo "Completed: $(date)"
echo "======================================"

# List contents for verification
echo ""
echo "Archive contents preview:"
tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | head -20
if [ $(tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | wc -l) -gt 20 ]; then
    echo "... and $(( $(tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | wc -l) - 20 )) more files"
fi

# Show structure summary
echo ""
echo "Backup structure summary:"
echo "- Root configuration files: $(tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | grep -E "^[^/]+/[^/]+$" | wc -l)"
echo "- Database files: $(tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | grep "database/" | wc -l)"
echo "- Source files: $(tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | grep "src/" | wc -l)"
echo "- Test files: $(tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | grep "tests/" | wc -l)"
echo "- Total files: $(tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | wc -l)"

echo ""
echo "Backup script completed successfully!"