# CardWise Browser Extension

Manifest V3 extension per `docs/11_BROWSER_EXTENSION.md`.

## Features

### V1 (M-021)

- Popup recommendation for supported merchant sites (hostname detection)
- Portfolio ranking via `POST /api/v1/recommendations/best-card`
- Extension auth with short-lived access tokens + refresh retry
- Gated by `browser_extension_enabled` feature flag

### V2 (M-032)

- **Auto-detect** supported merchants on page load (content script + toolbar badge)
- **Floating overlay** with live portfolio recommendation without opening the popup
- **Checkout amount detection** from page totals (best-effort DOM heuristics)
- **Matched offers** from M-031 offer intelligence (`GET /api/v1/offers/matches`)
- Collapsible overlay, manual refresh, and session hide

## Development

```bash
# From repo root — API + web should be running
bun run dev:extension   # watch build → apps/extension/dist

# Load unpacked in Chrome
# 1. chrome://extensions → Developer mode
# 2. Load unpacked → select apps/extension/dist
# 3. Sign in via the toolbar popup
# 4. Visit swiggy.com or amazon.in — overlay appears bottom-right
```

## Supported merchants

Hostname rules live in `src/lib/merchant-hosts.ts` (Amazon, Swiggy, Flipkart, etc.). Content scripts inject on the same host patterns.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:3000` | CardWise API (also used in `host_permissions`) |
| `VITE_WEB_URL` | `http://localhost:5173` | Consumer web app links |
| `VITE_EXTENSION_ENABLED` | enabled | Build-time kill switch |

Set in repo `.env` / `.env.local` before building.
