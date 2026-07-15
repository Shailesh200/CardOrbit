#!/usr/bin/env bash
# Start local infra (PostgreSQL, Redis, Mailpit) and all app/service dev servers.
# Usage: bun run dev
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker/docker-compose.yml"

cd "${ROOT_DIR}"

# shellcheck source=ensure-docker.sh
source "${ROOT_DIR}/scripts/ensure-docker.sh"
ensure_docker_running

echo "→ Starting local infrastructure (PostgreSQL, Redis, Mailpit)"
docker compose -f "${COMPOSE_FILE}" up -d --wait
echo "  PostgreSQL : localhost:${POSTGRES_PORT:-5433}"
echo "  Redis      : localhost:${REDIS_PORT:-6379}"
echo "  Mailpit UI : http://localhost:${MAILPIT_UI_PORT:-8025}"

echo "→ Starting all apps and services (apps/* + services/*)"
exec bunx turbo run dev --filter='./apps/*' --filter='./services/*'
