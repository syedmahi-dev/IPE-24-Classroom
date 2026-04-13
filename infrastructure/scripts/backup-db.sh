#!/bin/bash
# Daily PostgreSQL backup script
# Add to cron: 0 3 * * * /opt/ipe24/infrastructure/scripts/backup-db.sh

BACKUP_DIR="/opt/ipe24/backups"
CONTAINER="ipe24-postgres"
DB_NAME="ipe24_db"
DB_USER="ipe24"
RETENTION_DAYS=14

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create timestamped backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup..."

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILENAME"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup successful: $FILENAME ($(du -h $FILENAME | cut -f1))"
else
    echo "[$(date)] Backup FAILED!" >&2
    exit 1
fi

# Remove backups older than retention period
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days"
