#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-backups/files}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-exam-platform}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v "${PROJECT_NAME}_app_storage:/data:ro" \
  -v "$(pwd)/$BACKUP_DIR:/backups" \
  busybox:1.36 \
  tar -czf "/backups/app-storage-$TIMESTAMP.tgz" -C /data .

echo "$BACKUP_DIR/app-storage-$TIMESTAMP.tgz"
