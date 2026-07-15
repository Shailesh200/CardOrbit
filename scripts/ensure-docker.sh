#!/usr/bin/env bash
# CardWise — ensure Docker daemon is reachable (auto-start Colima on macOS when possible).
# Usage: source scripts/ensure-docker.sh && ensure_docker_running

ensure_docker_running() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi

  if command -v colima >/dev/null 2>&1; then
    echo "→ Docker is not running — starting Colima (may take a minute)..."
    colima start --cpu 4 --memory 6
  fi

  if docker info >/dev/null 2>&1; then
    return 0
  fi

  cat <<'EOF'
✗ Docker is not running. CardWise requires PostgreSQL, Redis, and Mailpit.

  macOS (Colima):  colima start --cpu 4 --memory 6
  Docker Desktop:  open Docker Desktop, then retry

  Or: bun run dev:infra

Then restart: bun run dev
EOF
  return 1
}
