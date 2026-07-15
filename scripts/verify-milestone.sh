#!/usr/bin/env bash
# Milestone verification — run before approval and commit (see plans/00_MASTER_DEVELOPMENT_PLAN.md)
set -euo pipefail

echo "→ bun run check"
bun run check

echo "→ bun run build"
bun run build

if find packages apps services -name '*.test.ts' -o -name '*.spec.ts' -o -name '*.test.tsx' -o -name '*.spec.tsx' 2>/dev/null | grep -q .; then
  echo "→ bun run test"
  bun run test
else
  echo "→ tests skipped (no test files yet)"
fi

echo "→ AI platform coverage (≥85% on assistant/rag/search)"
bash scripts/verify-ai-coverage.sh

echo "→ bun run ai:eval"
bun run ai:eval

echo "→ Web SEO baseline (apps/web)"
bash scripts/verify-web-seo.sh

if bash scripts/web-scope-touched.sh; then
  echo "→ Web quality (Lighthouse — apps/web scope touched or CI)"
  bash scripts/verify-web-lighthouse.sh
else
  echo "→ Web Lighthouse skipped (no apps/web changes; set FORCE_WEB_VERIFY=1 to run)"
fi

echo "✓ Milestone verification passed"
