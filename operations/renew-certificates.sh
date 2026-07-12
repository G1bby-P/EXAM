#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" --profile certbot run --rm certbot renew \
  --webroot \
  --webroot-path /var/www/certbot

docker compose --env-file "$ENV_FILE" exec -T nginx nginx -s reload
