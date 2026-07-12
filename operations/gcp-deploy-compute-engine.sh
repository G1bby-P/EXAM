#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

shell_quote() {
  printf "'"
  printf "%s" "$1" | sed "s/'/'\\\\''/g"
  printf "'"
}

for var in PROJECT_ID ADMIN_HOST STUDENT_HOST API_HOST LETSENCRYPT_EMAIL; do
  require_env "$var"
done

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud is required. Run this script from Google Cloud Shell or install Google Cloud CLI." >&2
  exit 1
fi

ZONE="${ZONE:-us-central1-a}"
REGION="${REGION:-${ZONE%-*}}"
INSTANCE_NAME="${INSTANCE_NAME:-exam-platform-prod}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-medium}"
BOOT_DISK_SIZE_GB="${BOOT_DISK_SIZE_GB:-50}"
ADDRESS_NAME="${ADDRESS_NAME:-exam-platform-ip}"
REPO_URL="${REPO_URL:-https://github.com/G1bby-P/EXAM.git}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/exam-platform}"
CERT_NAME="${CERT_NAME:-$ADMIN_HOST}"
LETSENCRYPT_STAGING="${LETSENCRYPT_STAGING:-1}"
CERTBOT_FORCE_RENEWAL="${CERTBOT_FORCE_RENEWAL:-0}"
ALLOW_INSECURE_HTTPS="${ALLOW_INSECURE_HTTPS:-$LETSENCRYPT_STAGING}"
SSH_SOURCE_RANGE="${SSH_SOURCE_RANGE:-0.0.0.0/0}"
RUN_CERTBOT="${RUN_CERTBOT:-1}"
RUN_SEED="${RUN_SEED:-1}"
FORCE_ENV_REWRITE="${FORCE_ENV_REWRITE:-0}"

echo "Using Google Cloud project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable compute.googleapis.com --project "$PROJECT_ID"

ensure_firewall_rule() {
  local name="$1"
  shift
  if gcloud compute firewall-rules describe "$name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Firewall rule already exists: $name"
  else
    gcloud compute firewall-rules create "$name" --project "$PROJECT_ID" "$@"
  fi
}

ensure_firewall_rule "exam-platform-allow-web" \
  --network default \
  --allow tcp:80,tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags exam-platform-web \
  --description "Allow HTTP and HTTPS traffic for the exam platform."

ensure_firewall_rule "exam-platform-allow-ssh" \
  --network default \
  --allow tcp:22 \
  --source-ranges "$SSH_SOURCE_RANGE" \
  --target-tags exam-platform-ssh \
  --description "Allow SSH administration for the exam platform VM."

if gcloud compute addresses describe "$ADDRESS_NAME" --region "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Static IP already exists: $ADDRESS_NAME"
else
  gcloud compute addresses create "$ADDRESS_NAME" --region "$REGION" --project "$PROJECT_ID"
fi

EXTERNAL_IP="$(gcloud compute addresses describe "$ADDRESS_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(address)')"
echo "Static public IP: $EXTERNAL_IP"

if gcloud compute instances describe "$INSTANCE_NAME" --zone "$ZONE" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "VM already exists: $INSTANCE_NAME"
else
  gcloud compute instances create "$INSTANCE_NAME" \
    --project "$PROJECT_ID" \
    --zone "$ZONE" \
    --machine-type "$MACHINE_TYPE" \
    --tags exam-platform-web,exam-platform-ssh \
    --address "$EXTERNAL_IP" \
    --image-family ubuntu-2404-lts-amd64 \
    --image-project ubuntu-os-cloud \
    --boot-disk-size "${BOOT_DISK_SIZE_GB}GB" \
    --boot-disk-type pd-balanced
fi

echo "Before HTTPS can work, DNS A records must point to this IP:"
echo "  $ADMIN_HOST -> $EXTERNAL_IP"
echo "  $STUDENT_HOST -> $EXTERNAL_IP"
echo "  $API_HOST -> $EXTERNAL_IP"

if [[ "$RUN_CERTBOT" = "1" ]]; then
  DNS_READY=1
  for host in "$ADMIN_HOST" "$STUDENT_HOST" "$API_HOST"; do
    if getent ahostsv4 "$host" | awk '{print $1}' | grep -Fx "$EXTERNAL_IP" >/dev/null 2>&1; then
      echo "DNS OK: $host points to $EXTERNAL_IP"
    else
      echo "DNS is not ready: $host must point to $EXTERNAL_IP" >&2
      DNS_READY=0
    fi
  done

  if [[ "$DNS_READY" != "1" ]]; then
    echo "Update DNS A records and rerun this script. Existing Google Cloud resources will be reused." >&2
    echo "To deploy HTTP without requesting certificates, rerun with RUN_CERTBOT=0." >&2
    exit 1
  fi
fi

REMOTE_SCRIPT="$(mktemp)"
trap 'rm -f "$REMOTE_SCRIPT"' EXIT

cat > "$REMOTE_SCRIPT" <<'REMOTE_SETUP'
#!/usr/bin/env bash
set -euo pipefail

: "${REPO_URL:?REPO_URL is required}"
: "${GITHUB_BRANCH:?GITHUB_BRANCH is required}"
: "${APP_DIR:?APP_DIR is required}"
: "${ADMIN_HOST:?ADMIN_HOST is required}"
: "${STUDENT_HOST:?STUDENT_HOST is required}"
: "${API_HOST:?API_HOST is required}"
: "${CERT_NAME:?CERT_NAME is required}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL is required}"

APP_USER="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg git ufw openssl

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

usermod -aG docker "$APP_USER" || true
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  sudo -H -u "$APP_USER" git -C "$APP_DIR" fetch origin "$GITHUB_BRANCH"
  sudo -H -u "$APP_USER" git -C "$APP_DIR" checkout "$GITHUB_BRANCH"
  sudo -H -u "$APP_USER" git -C "$APP_DIR" reset --hard "origin/$GITHUB_BRANCH"
else
  if [[ -n "$(find "$APP_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    echo "$APP_DIR is not empty and is not a Git repository." >&2
    exit 1
  fi
  sudo -H -u "$APP_USER" git clone --branch "$GITHUB_BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ ! -f .env.production || "${FORCE_ENV_REWRITE:-0}" = "1" ]]; then
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  JWT_ACCESS_SECRET="$(openssl rand -hex 64)"
  JWT_REFRESH_SECRET="$(openssl rand -hex 64)"
  SEED_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"
  SEED_TEST_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"
  SEED_TEST_STUDENT_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"
  GRAFANA_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"

  cat > .env.production <<ENV_FILE
POSTGRES_DB=exam_platform
POSTGRES_USER=exam_platform
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN_DAYS=30
BCRYPT_ROUNDS=12

SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD
SEED_TEST_ADMIN_PASSWORD=$SEED_TEST_ADMIN_PASSWORD
SEED_TEST_STUDENT_PASSWORD=$SEED_TEST_STUDENT_PASSWORD

API_PREFIX=api/v1
SWAGGER_ENABLED=false
SWAGGER_PATH=docs

ADMIN_HOST=$ADMIN_HOST
STUDENT_HOST=$STUDENT_HOST
API_HOST=$API_HOST
CERT_NAME=$CERT_NAME

HTTP_PORT=80
HTTPS_PORT=443
CLIENT_MAX_BODY_SIZE=20m
NEXT_PUBLIC_API_BASE_URL=/api/v1
CORS_ORIGINS=https://$ADMIN_HOST,https://$STUDENT_HOST,https://$API_HOST

LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL
LETSENCRYPT_STAGING=${LETSENCRYPT_STAGING:-1}
CERTBOT_FORCE_RENEWAL=${CERTBOT_FORCE_RENEWAL:-0}
ALLOW_INSECURE_HTTPS=${ALLOW_INSECURE_HTTPS:-1}

LOG_MAX_SIZE=10m
LOG_MAX_FILE=5
BACKUP_RETENTION_DAYS=14
BACKUP_INTERVAL_SECONDS=86400

PROMETHEUS_BIND=127.0.0.1:9090
GRAFANA_BIND=127.0.0.1:3001
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
ENV_FILE

  cat > DEPLOYMENT_CREDENTIALS.txt <<CREDS
Generated production seed credentials.
Keep this file private and delete it after storing the values in a password manager.

admin@exam.local: $SEED_ADMIN_PASSWORD
admin@test.com: $SEED_TEST_ADMIN_PASSWORD
alumno@test.com: $SEED_TEST_STUDENT_PASSWORD
Grafana admin: $GRAFANA_ADMIN_PASSWORD
CREDS

  chmod 600 .env.production DEPLOYMENT_CREDENTIALS.txt
  chown "$APP_USER:$APP_USER" .env.production DEPLOYMENT_CREDENTIALS.txt
else
  echo ".env.production already exists. Keeping existing secrets."
fi

chmod +x operations/*.sh

if [[ "${RUN_CERTBOT:-1}" = "1" ]]; then
  ./operations/init-letsencrypt.sh
else
  cp nginx/templates/default.http.conf.template.example nginx/templates/default.conf.template
  docker compose --env-file .env.production up -d --build
fi

if [[ "${RUN_SEED:-1}" = "1" ]]; then
  docker compose --env-file .env.production --profile seed up api-seed
fi

docker compose --env-file .env.production ps
REMOTE_SETUP

chmod +x "$REMOTE_SCRIPT"
gcloud compute scp "$REMOTE_SCRIPT" "$INSTANCE_NAME:/tmp/exam-platform-remote-setup.sh" --zone "$ZONE" --project "$PROJECT_ID"

REMOTE_COMMAND="sudo env REPO_URL=$(shell_quote "$REPO_URL") GITHUB_BRANCH=$(shell_quote "$GITHUB_BRANCH") APP_DIR=$(shell_quote "$APP_DIR") ADMIN_HOST=$(shell_quote "$ADMIN_HOST") STUDENT_HOST=$(shell_quote "$STUDENT_HOST") API_HOST=$(shell_quote "$API_HOST") CERT_NAME=$(shell_quote "$CERT_NAME") LETSENCRYPT_EMAIL=$(shell_quote "$LETSENCRYPT_EMAIL") LETSENCRYPT_STAGING=$(shell_quote "$LETSENCRYPT_STAGING") CERTBOT_FORCE_RENEWAL=$(shell_quote "$CERTBOT_FORCE_RENEWAL") ALLOW_INSECURE_HTTPS=$(shell_quote "$ALLOW_INSECURE_HTTPS") RUN_CERTBOT=$(shell_quote "$RUN_CERTBOT") RUN_SEED=$(shell_quote "$RUN_SEED") FORCE_ENV_REWRITE=$(shell_quote "$FORCE_ENV_REWRITE") bash /tmp/exam-platform-remote-setup.sh"

gcloud compute ssh "$INSTANCE_NAME" --zone "$ZONE" --project "$PROJECT_ID" --command "$REMOTE_COMMAND"

echo "Deployment command completed."
echo "Public IP: $EXTERNAL_IP"
echo "Admin URL: https://$ADMIN_HOST"
echo "Student URL: https://$STUDENT_HOST"
echo "API health URL: https://$API_HOST/api/v1/health"
echo "Initial credentials are stored on the VM at: $APP_DIR/DEPLOYMENT_CREDENTIALS.txt"
