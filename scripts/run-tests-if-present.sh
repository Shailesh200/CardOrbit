#!/usr/bin/env bash
set -euo pipefail
if find packages apps services -name '*.test.ts' -o -name '*.spec.ts' -o -name '*.test.tsx' -o -name '*.spec.tsx' 2>/dev/null | grep -q .; then
  turbo run test
else
  echo "No tests defined — skipped"
fi
