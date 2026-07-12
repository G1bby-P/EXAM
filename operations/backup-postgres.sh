#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
docker compose --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/exam-platform-$TIMESTAMP.sql.gz"

echo "$BACKUP_DIR/exam-platform-$TIMESTAMP.sql.gz"
