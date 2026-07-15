#!/usr/bin/env bash
# AI platform coverage gate — assistant, RAG, and semantic search modules (≥85%).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "→ AI module coverage (@cardwise/api assistant/rag/search ≥85%)"
(cd "$ROOT/services/api" && bun run test:coverage:ai)

echo "→ AI package tests (@cardwise/ai, @cardwise/ai-assistant-widget, validation/ai)"
(cd "$ROOT/packages/ai" && bun run test)
(cd "$ROOT/packages/ai-assistant-widget" && bun run test)
(cd "$ROOT/packages/validation" && bun run test -- src/ai)

echo "→ Web assistant integration tests"
(cd "$ROOT/apps/web" && bun run test -- src/features/assistant)

echo "✓ AI coverage verification passed"
