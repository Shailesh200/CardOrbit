# Web performance baseline & milestone gates

Lighthouse lab audits on **production preview** (`vite preview`, port **4173**) — **all consumer routes**.

> **Browser DevTools mismatch?** Auditing `localhost:5173` (Vite dev) produces much worse scores (unminified JS, no prerender, HMR). Match CI with:
> ```bash
> cd apps/web && bun run build && bun run preview
> # open http://localhost:4173 — use Lighthouse mobile mode
> ```
> Or run `WEB_LH_FORM_FACTOR=desktop bash scripts/verify-web-lighthouse.sh` to mirror DevTools desktop.

## Routes audited (15 screens)

| Screen | Path | Tier |
|--------|------|------|
| Home | `/` | critical (strictest CWV; lab LCP ~3.1s post AI-012 branding) |
| Login | `/login` | public |
| Signup | `/signup` | public |
| Verify email | `/verify-email` | public |
| Forgot password | `/forgot-password` | public |
| Reset password | `/reset-password` | public |
| Privacy | `/privacy` | public |
| Terms | `/terms` | public |
| Cookies | `/cookies` | public |
| Onboarding | `/onboarding` | app (mock auth) |
| Portfolio | `/account/cards` | app |
| Add card | `/account/cards/add` | app |
| Card detail | `/account/cards/lighthouse-sample` | app |
| Profile | `/account/profile` | app |
| Settings | `/account/settings` | app |

Config: `scripts/web-lighthouse-routes.json`

## Baseline — 2026-07-09 (pre-optimization, M-015)

Recorded before route splitting, prerender, and CWV enforcement.

| Metric | Value |
|--------|------:|
| Lighthouse Performance | 45 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| **LCP** | 4.4 s |
| **CLS** | 0.000 |
| **FCP** | 4.0 s |
| **TBT** | 5.2 s |
| **Speed Index** | 4.0 s |
| **TTI** | 14.4 s |
| **TTFB** | 461 ms |
| **Max Potential FID** (INP lab proxy) | 202 ms |
| **INP** | n/a (field / interaction trace) |

## Current — 2026-07-09 (post-optimization, M-016 perf pass)

After homepage prerender + hydration, route/code splitting, deferred fonts/showcase, CSS diet, and CWV gates.

| Metric | Value | Gate |
|--------|------:|------|
| Lighthouse Performance | **95** | ≥ 85 |
| **LCP** | **2.5 s** | ≤ 2.5 s (+100 ms lab slack) |
| **CLS** | **0.059** | ≤ 0.1 |
| **FCP** | **2.2 s** | ≤ 2.3 s |
| **TBT** | **43 ms** | ≤ 200 ms |
| **Speed Index** | **2.2 s** | ≤ 3.4 s |
| **TTI** | **2.5 s** | ≤ 3.8 s |
| **TTFB** | **454 ms** | ≤ 800 ms |
| **Max Potential FID** | **70 ms** | ≤ 100 ms |

Stretch goal (Google “good” FCP for static pages): **≤ 1.8 s** — track in future milestones; SPA + Tailwind bundle currently limits lab FCP to ~2.2 s.

## Enforced on web milestone verification

When `apps/web` changes, `bun run verify:milestone` runs `scripts/verify-web-lighthouse.sh` on **every route** above, which **fails** if any screen misses its tier targets.

### Tier thresholds

| Tier | Screens | Performance | LCP | FCP | SEO |
|------|---------|-------------|-----|-----|-----|
| **critical** | Home | ≥ 85 | ≤ 2.5 s | ≤ 2.3 s | ≥ 90 |
| **public** | Auth + legal | ≥ 80 | ≤ 3.5 s | ≤ 2.8 s | ≥ 90 |
| **app** | Account + onboarding | ≥ 75 | ≤ 5.0 s | ≤ 3.5 s | ≥ 60 |

All tiers: CLS ≤ 0.1–0.12, TBT/TTFB/Speed Index/TTI per `scripts/web-lighthouse-routes.json`. (+100 ms lab tolerance on LCP/FCP.)

Override via env: `WEB_CWV_MAX_LCP_MS`, `WEB_LH_FORM_FACTOR=desktop`, etc.

## Process

1. Note current numbers in this file when making large perf changes.
2. Run `bash scripts/verify-web-lighthouse.sh` after `apps/web` changes.
3. Milestone approval requires green CWV + category scores when web scope is touched.
4. Do not regress below the **Current** row without explicit approval.

## Key optimizations applied

- Build-time homepage **SSR prerender** + client **hydration** (`apps/web/scripts/prerender-home.mjs`)
- Lazy routes, vendor chunks (react, ui, icons, lottie), deferred Sentry
- Hero showcase + consent banner deferred until after `load` + idle
- Google Fonts deferred until 10 s after `load` (font swap was shifting LCP)
- Onboarding CSS split out of global bundle (~14 KB saved on homepage)
- CSS preload + inline layout-critical hero styles in `index.html`
- Removed canvas rAF hero background (CSS-only ambient)
