#!/usr/bin/env sh
set -eu

ENV_FILE="${ENV_FILE:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${ADMIN_HOST:?ADMIN_HOST is required}"
: "${STUDENT_HOST:?STUDENT_HOST is required}"
: "${API_HOST:?API_HOST is required}"
: "${CERT_NAME:?CERT_NAME is required}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL is required}"

STAGING_ARG=""
if [ "${LETSENCRYPT_STAGING:-1}" = "1" ]; then
  STAGING_ARG="--staging"
  echo "Using Let's Encrypt staging. Set LETSENCRYPT_STAGING=0 for trusted production certificates."
fi

FORCE_ARG=""
if [ "${CERTBOT_FORCE_RENEWAL:-0}" = "1" ]; then
  FORCE_ARG="--force-renewal"
fi

echo "Starting application with HTTP challenge support..."
cp nginx/templates/default.http.conf.template.example nginx/templates/default.conf.template
docker compose --env-file "$ENV_FILE" up -d --build

echo "Requesting certificate for $ADMIN_HOST, $STUDENT_HOST and $API_HOST..."
docker compose --env-file "$ENV_FILE" --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --cert-name "$CERT_NAME" \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING_ARG \
  $FORCE_ARG \
  -d "$ADMIN_HOST" \
  -d "$STUDENT_HOST" \
  -d "$API_HOST"

echo "Enabling HTTPS Nginx template..."
cp nginx/templates/default.https.conf.template.example nginx/templates/default.conf.template
docker compose --env-file "$ENV_FILE" up -d nginx
docker compose --env-file "$ENV_FILE" exec -T nginx nginx -s reload

echo "HTTPS is configured. Validate with: ./operations/healthcheck.sh"
