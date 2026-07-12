#!/usr/bin/env sh
set -eu

BACKUP_FILE="${1:-}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-exam-platform}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: ./operations/restore-files.sh <app-storage-backup.tgz>" >&2
  exit 1
fi

BACKUP_DIR="$(cd "$(dirname "$BACKUP_FILE")" && pwd)"
BACKUP_NAME="$(basename "$BACKUP_FILE")"

docker run --rm \
  -v "${PROJECT_NAME}_app_storage:/data" \
  -v "$BACKUP_DIR:/backups:ro" \
  busybox:1.36 \
  sh -c "rm -rf /data/* && tar -xzf /backups/$BACKUP_NAME -C /data"
