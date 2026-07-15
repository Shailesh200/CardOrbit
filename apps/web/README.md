# CardWise Web (`@cardwise/web`)

Consumer PWA shell — Vite 6 + React 19 + React Router v7 (M-005).

## Commands

```bash
# from repo root
bun run dev:web

# from apps/web
bun run dev
bun run build
```

## Routes

| Path | Page |
|------|------|
| `/` | Home shell |
| `/privacy` | Privacy policy + export/delete stubs |
| `/terms` | Terms of service |
| `/cookies` | Cookie policy |

Consent banner stores preferences in `localStorage` under `cardwise.consent`.

Default port: **5173** (dev). API proxy targets `http://localhost:3000`.

## Lighthouse / CWV verification

CI audits **all 15 consumer screens** on the **production build** (port **4173**), not the dev server:

```bash
# from repo root
bun run build --filter=@cardwise/web
cd apps/web && bun run preview   # http://localhost:4173
# In Chrome DevTools Lighthouse: use this URL, mobile mode

bash scripts/verify-web-lighthouse.sh          # all routes, mobile (CI default)
WEB_LH_FORM_FACTOR=desktop bash scripts/verify-web-lighthouse.sh
```

Route list and per-screen thresholds: `scripts/web-lighthouse-routes.json`, `docs/design/WEB_PERFORMANCE_BASELINE.md`.
