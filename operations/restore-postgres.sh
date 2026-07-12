#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: ./operations/restore-postgres.sh <backup.sql|backup.sql.gz>" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

case "$BACKUP_FILE" in
  *.gz)
    gzip -dc "$BACKUP_FILE" | docker compose --env-file "$ENV_FILE" exec -T postgres \
      psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"
    ;;
  *)
    docker compose --env-file "$ENV_FILE" exec -T postgres \
      psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB" \
      < "$BACKUP_FILE"
    ;;
esac
