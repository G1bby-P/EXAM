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

API_PREFIX="${API_PREFIX:-api/v1}"
CURL_TLS_ARG=""
if [ "${ALLOW_INSECURE_HTTPS:-0}" = "1" ]; then
  CURL_TLS_ARG="-k"
fi

docker compose --env-file "$ENV_FILE" ps
curl $CURL_TLS_ARG -fsS "https://$API_HOST/$API_PREFIX/health"
curl $CURL_TLS_ARG -fsI "https://$ADMIN_HOST/login" >/dev/null
curl $CURL_TLS_ARG -fsI "https://$STUDENT_HOST/login" >/dev/null

echo "Healthcheck OK"
