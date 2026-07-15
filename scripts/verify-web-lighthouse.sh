#!/usr/bin/env bash
# Lighthouse audit against production preview of apps/web — all consumer routes.
# Enforces category scores + Core Web Vitals per route tier.
# Baseline: docs/design/WEB_PERFORMANCE_BASELINE.md
#
# IMPORTANT: Audits http://127.0.0.1:4173 (vite preview / production build).
# Browser DevTools on localhost:5173 (dev server) will NOT match these numbers.
# Use WEB_LH_FORM_FACTOR=desktop to mirror DevTools desktop mode.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"
PORT="${WEB_PREVIEW_PORT:-4173}"
URL="http://127.0.0.1:${PORT}/"

LH_BIN="$ROOT/node_modules/.bin/lighthouse"
if [ ! -x "$LH_BIN" ]; then
  echo "✗ lighthouse not installed — run: bun add -d lighthouse (from repo root)" >&2
  exit 1
fi

log() {
  echo "$@" >&2
}

free_port() {
  if command -v lsof >/dev/null 2>&1 && lsof -ti:"$PORT" >/dev/null 2>&1; then
    log "→ Freeing port ${PORT}"
    lsof -ti:"$PORT" | xargs kill 2>/dev/null || true
    sleep 0.5
  fi
}

if [ "${WEB_LH_FORCE_BUILD:-0}" = "1" ] || [ ! -f "$WEB/dist/index.html" ]; then
  log "→ Building @cardwise/web"
  (cd "$WEB" && bun run build)
else
  log "→ Using existing @cardwise/web build (set WEB_LH_FORCE_BUILD=1 to rebuild)"
fi

PREVIEW_PID=""
cleanup() {
  if [ -n "$PREVIEW_PID" ] && kill -0 "$PREVIEW_PID" 2>/dev/null; then
    kill "$PREVIEW_PID" 2>/dev/null || true
    wait "$PREVIEW_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

free_port

log "→ Starting production preview on ${URL}"
(cd "$WEB" && bun run preview -- --host 127.0.0.1 --port "$PORT") >/dev/null 2>&1 &
PREVIEW_PID=$!

for i in $(seq 1 40); do
  if curl -sf "$URL" >/dev/null 2>&1; then
    log "→ Preview ready (${i} attempts)"
    break
  fi
  sleep 0.25
done

if ! curl -sf "$URL" >/dev/null 2>&1; then
  log "✗ Preview server did not start at ${URL}"
  exit 1
fi

export WEB_PREVIEW_PORT="$PORT"
node "$ROOT/scripts/lighthouse-audit-routes.mjs"

log "✓ Web Lighthouse passed (all routes)"
