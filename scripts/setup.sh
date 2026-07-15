#!/usr/bin/env bash
# CardWise first-time developer setup (M-002)
# Usage: bash scripts/setup.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker/docker-compose.yml"

cd "${ROOT_DIR}"

echo "CardWise — developer setup"
echo "──────────────────────────"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "✗ Required command not found: $1"
    exit 1
  fi
}

require_cmd bun
require_cmd docker

# shellcheck source=ensure-docker.sh
source "${ROOT_DIR}/scripts/ensure-docker.sh"
ensure_docker_running || exit 1

echo "→ Installing dependencies (bun install)"
bun install

if [[ ! -f .env.local && ! -f .env ]]; then
  echo "→ Creating .env.local from .env.example"
  cp .env.example .env.local
  echo "  Edit .env.local if you need non-default local values."
elif [[ -f .env.local ]]; then
  echo "→ .env.local already exists (skipped)"
else
  echo "→ .env already exists (skipped)"
fi

echo "→ Starting local infrastructure (PostgreSQL, Redis, Mailpit)"
docker compose -f "${COMPOSE_FILE}" up -d --wait

echo "→ Verifying PostgreSQL"
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  pg_isready -U cardwise -d cardwise_dev >/dev/null

echo "→ Verifying Redis"
docker compose -f "${COMPOSE_FILE}" exec -T redis redis-cli ping | grep -q PONG

echo "→ Verifying Mailpit UI"
curl -sf "http://localhost:${MAILPIT_UI_PORT:-8025}" >/dev/null

echo "→ Running Prisma migrations"
bun run db:generate
bun run db:migrate

echo "→ Seeding catalog data"
bun run db:seed

echo "→ Running quality checks"
bun run verify:milestone

echo ""
echo "✓ Setup complete"
echo ""
echo "  PostgreSQL : localhost:${POSTGRES_PORT:-5433} (cardwise_dev)"
echo "  Redis      : localhost:${REDIS_PORT:-6379}"
echo "  Mailpit UI : http://localhost:${MAILPIT_UI_PORT:-8025}"
echo "  API        : http://localhost:3000  (bun run dev:api)"
echo "  Web        : http://localhost:5173  (bun run dev:web)"
echo "  Swagger    : http://localhost:3000/api/docs"
echo ""
echo "Next: M-006+ milestones — see plans/00_MASTER_DEVELOPMENT_PLAN.md"
