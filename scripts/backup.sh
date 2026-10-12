#!/bin/bash
set -e

BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +%Y_%m_%d_%H_%M_%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

echo "💾 Creating PostgreSQL database backup for testhub..."
pg_dump -U ${DB_USER:-postgres} -h ${DB_HOST:-localhost} ${DB_NAME:-testhub} > "$BACKUP_FILE"

gzip "$BACKUP_FILE"
echo "✅ Backup created successfully: ${BACKUP_FILE}.gz"
