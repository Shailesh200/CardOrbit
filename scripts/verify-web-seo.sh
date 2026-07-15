#!/usr/bin/env bash
# Static SEO baseline checks for apps/web (no browser required).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"
INDEX="$WEB/index.html"
fail=0

check() {
  if ! eval "$2"; then
    echo "✗ SEO: $1"
    fail=1
  else
    echo "✓ SEO: $1"
  fi
}

[ -f "$INDEX" ] || { echo "✗ apps/web/index.html missing"; exit 1; }

check 'html lang=en-IN' "grep -q 'lang=\"en-IN\"' '$INDEX'"
check 'charset meta' "grep -q 'charset=\"UTF-8\"' '$INDEX'"
check 'viewport meta' "grep -q 'name=\"viewport\"' '$INDEX'"
check 'meta description' "grep -q 'name=\"description\"' '$INDEX'"
check 'document title' "grep -q '<title>' '$INDEX'"
check 'favicon link' "grep -q 'rel=\"icon\"' '$INDEX'"
check 'og:title' "grep -q 'property=\"og:title\"' '$INDEX'"
check 'og:description' "grep -q 'property=\"og:description\"' '$INDEX'"
check 'favicon.svg exists' "[ -f '$WEB/public/favicon.svg' ]"
check 'robots.txt exists' "[ -f '$WEB/public/robots.txt' ]"
check 'consumer theme imported' "grep -q 'consumer-theme.css' '$WEB/src/styles.css'"
check 'ScrollToTop wired' "grep -q 'ScrollToTop' '$WEB/src/app/App.tsx'"
check 'HeroLogo in shell' "grep -q 'HeroLogo' '$WEB/src/app/AppShell.tsx'"

if [ "$fail" -ne 0 ]; then
  echo "✗ Web SEO baseline failed — see docs/design/WEB_CONSUMER_DESIGN_SYSTEM.md"
  exit 1
fi

echo "✓ Web SEO baseline passed"
