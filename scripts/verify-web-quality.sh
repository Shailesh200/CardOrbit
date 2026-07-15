#!/usr/bin/env bash
# Web quality gates — SEO baseline + Lighthouse (see docs/design/WEB_CONSUMER_DESIGN_SYSTEM.md).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ Web quality: SEO baseline"
bash "$SCRIPT_DIR/verify-web-seo.sh"

echo "→ Web quality: Lighthouse"
bash "$SCRIPT_DIR/verify-web-lighthouse.sh"

echo "✓ Web quality verification passed"
