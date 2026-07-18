#!/usr/bin/env bash
# Open a local GUI (Prisma Studio) against production Postgres via SSH tunnel.
# Usage: ./scripts/prod-db-gui.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="${CARDORBIT_SSH_KEY:-$HOME/.ssh/cardorbit_hetzner}"
HOST="${CARDORBIT_SSH_HOST:-root@167.233.223.123}"
APP_UUID="${CARDORBIT_COOLIFY_UUID:-hoci5uux0n03wivuoxcj9awv}"
LOCAL_PG_PORT="${LOCAL_PG_PORT:-15432}"
STUDIO_PORT="${STUDIO_PORT:-5555}"
URL_FILE="$ROOT/.local/prod-database-url"

mkdir -p "$ROOT/.local"
chmod 700 "$ROOT/.local"

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found: $KEY" >&2
  exit 1
fi

# Stop previous tunnel/studio on these ports
lsof -ti "tcp:${STUDIO_PORT}" | xargs kill -9 2>/dev/null || true
lsof -ti "tcp:${LOCAL_PG_PORT}" | xargs kill -9 2>/dev/null || true

PG_NAME=$(ssh -i "$KEY" "$HOST" "docker ps --format '{{.Names}}' | grep -i '^postgres-${APP_UUID}' | head -1")
if [[ -z "$PG_NAME" ]]; then
  echo "Postgres container not found for $APP_UUID" >&2
  exit 1
fi

PG_IP=$(ssh -i "$KEY" "$HOST" "docker inspect -f '{{range \$k,\$v := .NetworkSettings.Networks}}{{if eq \$k \"${APP_UUID}\"}}{{\$v.IPAddress}}{{end}}{{end}}' '$PG_NAME'")
if [[ -z "$PG_IP" ]]; then
  echo "Could not resolve Postgres IP for $PG_NAME" >&2
  exit 1
fi

echo "Tunneling localhost:${LOCAL_PG_PORT} -> ${PG_IP}:5432 (${PG_NAME})"
ssh -i "$KEY" -f -N -o ExitOnForwardFailure=yes -L "${LOCAL_PG_PORT}:${PG_IP}:5432" "$HOST"

PASS=$(ssh -i "$KEY" "$HOST" "python3 -c \"
import re
from pathlib import Path
env = Path('/data/coolify/applications/${APP_UUID}/.env').read_text()
m = re.search(r'^DATABASE_URL=postgresql://[^:]+:([^@]+)@', env, re.M)
print(m.group(1) if m else '')
\"")
if [[ -z "$PASS" ]]; then
  echo "Could not read DATABASE_URL password from Coolify env" >&2
  exit 1
fi

umask 077
printf 'postgresql://cardorbit:%s@127.0.0.1:%s/cardorbit\n' "$PASS" "$LOCAL_PG_PORT" >"$URL_FILE"
unset PASS

echo "Prisma Studio → http://localhost:${STUDIO_PORT}"
cd "$ROOT/services/api"
exec env DATABASE_URL="$(cat "$URL_FILE")" bunx prisma studio --port "$STUDIO_PORT"
