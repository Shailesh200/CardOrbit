#!/usr/bin/env bash
# Exit 0 when apps/web should run quality gates (SEO + Lighthouse).
set -euo pipefail

if [ "${FORCE_WEB_VERIFY:-}" = "1" ]; then
  exit 0
fi

if [ ! -d apps/web ]; then
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

if git diff --name-only | grep -q '^apps/web/'; then
  exit 0
fi

if git diff --cached --name-only | grep -q '^apps/web/'; then
  exit 0
fi

if git rev-parse HEAD~1 >/dev/null 2>&1; then
  if git diff --name-only HEAD~1 HEAD | grep -q '^apps/web/'; then
    exit 0
  fi
fi

if [ "${CI:-}" = "true" ]; then
  exit 0
fi

exit 1
