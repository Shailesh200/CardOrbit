# Screen state audit matrix

Audit artifact for CardOrbit **web** + **admin** UX reliability. Each route × state × viewport cell is Pass / Fail / Pending. Any **Fail** against the human-comprehension rubric is a **P0** until fixed.

**Viewports**

| Key | Size | Notes |
| --- | --- | --- |
| Desktop | 1280×720 | Playwright project `desktop` |
| PWA | 390×844 | Playwright project `pwa` (mobile chrome) |

**States** (exclusive — never mix)

| State | Meaning |
| --- | --- |
| Loading | Skeletons / route fallback |
| Empty | No data + why + CTA |
| Error | Failed load + retry / navigate |
| Ready | Happy path content |
| Session | Auth expiry / re-login |
| Offline | Connectivity banner (shell) |

---

## Human-comprehension rubric (fail = P0)

All applicable checks must be **yes**. Any **no** = defect.

### Core (every route × state)

1. Within ~3s, clear what the screen is for (title / H1 / landmark)
2. Exclusive state: waiting / empty / failed / ready (no mixed spinner + stale + toast)
3. Human language only (no codes, status numbers, API jargon, stack traces)
4. Empty or failed → exactly one clear next action
5. Loading: layout-matched skeleton; no blank flash
6. Empty: explains why + natural CTA (not “No data”)
7. Error: impact + retry; not toast-only; no double messaging
8. Session: one expiry signal; land on login; never raw `Unauthorized`
9. PWA: primary actions reachable; toast not covering the only CTA
10. PWA: no hover-only requirement to complete the task
11. Overlays never hide the only way forward
12. Deep-link refresh still understandable
13. **Update available:** clear “new version” + Reload; one toast; user chooses when
14. Offline banner distinct from empty/error; readable
15. No UI-leak denylist hits (`Unauthorized`, `Prisma`, stack frames, raw JSON errors, etc.)

### Shell / product (when applicable)

16. Consent is understandable, dismissible, and doesn’t block primary nav
17. Flag-off surfaces explain “not available” or hide cleanly — no broken empty pages
18. Theme switch: readable chrome + toasts in both modes
19. HostGate redirect: user knows a navigation is happening
20. Forms: errors next to fields, not only vanishing toasts
21. Catalog consider: user can tell portfolio best vs unowned catalog pick, and how to add a card
22. Admin ingest review: reviewer can see which source (HTML vs MITC) backed fees/rewards before publish
23. Admin every screen: human-understandable states; no theme/contrast leaks
24. Each India bank source has a registered deep crawler + fixture (not generic-only)

---

## Legend

| Mark | Meaning |
| --- | --- |
| **Pass** | Covered by this delivery (Playwright and/or verified implementation) |
| Pending | Matrix cell not yet audited end-to-end |
| Fail | Open P0 — must fix before DoD |

Automated leak gate: `apps/web/e2e` → `expectNoUiLeaks` (denylist synced with `apps/web/src/lib/ui-leak-denylist.ts`).

```bash
bun run e2e                 # root → @cardwise/web
bun run --filter @cardwise/web e2e:ui
```

---

## Global surfaces (web)

| Surface | Loading | Empty | Error | Ready | Session | Offline | Desktop | PWA | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consent banner | — | — | — | Pending | — | — | Pending | Pending | Rubric #16 |
| Offline banner | — | — | — | **Pass** | — | **Pass** | **Pass** | **Pass** | `offline-banner.spec.ts` |
| SW update toast | Pending | — | — | Pending | — | — | Pending | Pending | Rubric #13 |
| HostGate interstitial | — | — | Pending | Pending | — | — | Pending | — | Localhost no-op |
| Theme toggle + toaster | — | — | — | Pending | — | — | Pending | Pending | Rubric #18 |
| Session 401 → login | — | — | — | — | **Pass** | — | **Pass** | **Pass** | `session-401.spec.ts`; no `Unauthorized` toast |
| Notify / UI-leak denylist | — | — | **Pass** | **Pass** | **Pass** | — | **Pass** | **Pass** | Unit + e2e leak asserts |
| Branded 404 (`*`) | — | — | — | Pending | — | — | Pending | Pending | |

---

## Web — public / auth routes

| Route | Loading | Empty | Error | Ready | Session | Desktop | PWA | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Pending | — | Pending | **Pass** | — | **Pass** | **Pass** | `smoke-public.spec.ts` |
| `/login` | Pending | — | Pending | **Pass** | **Pass** | **Pass** | **Pass** | Smoke + session 401 land |
| `/signup` | Pending | — | Pending | Pending | — | Pending | Pending | |
| `/verify-email` | Pending | — | Pending | Pending | — | Pending | Pending | |
| `/forgot-password` | Pending | — | Pending | Pending | — | Pending | Pending | |
| `/reset-password` | Pending | — | Pending | Pending | — | Pending | Pending | |
| `/oauth/callback` | Pending | — | Pending | Pending | — | Pending | Pending | OAuth `?error=` |
| `/privacy` | Pending | — | Pending | Pending | — | Pending | Pending | |
| `/terms` | Pending | — | Pending | Pending | — | Pending | Pending | |
| `/cookies` | Pending | — | Pending | Pending | — | Pending | Pending | |
| `/onboarding` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Fail-closed gate |

---

## Web — account routes

| Route | Loading | Empty | Error | Ready | Session | Desktop | PWA | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/account` (dashboard) | Pending | Pending | Pending | **Pass** | **Pass** | **Pass** | **Pass** | Stubbed ready + catalog consider + 401 |
| `/account` catalog consider | Pending | Pending | Pending | **Pass** | — | **Pass** | **Pass** | `catalog-consider.spec.ts`; rubric #21 |
| `/account/cards` | Pending | Pending | Pending | **Pass** | Pending | **Pass** | **Pass** | `account-stubbed.spec.ts` |
| `/account/cards/add` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Prefill `?q=` / `?slug=` |
| `/account/cards/compare` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/cards/:id` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/merchants` | Pending | Pending | Pending | **Pass** | Pending | **Pass** | **Pass** | Stubbed smoke |
| `/account/merchants/:slug` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Catalog consider on merchant panel |
| `/account/offers` | Pending | Pending | Pending | **Pass** | Pending | **Pass** | **Pass** | Stubbed smoke |
| `/account/offers/:slug` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/profile` | Pending | — | Pending | **Pass** | Pending | **Pass** | **Pass** | Stubbed smoke |
| `/account/settings` | Pending | — | Pending | **Pass** | Pending | **Pass** | **Pass** | Stubbed smoke |
| `/account/notifications` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/transactions` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/billing` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/insights/spending` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/calendar` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Flag-gated |
| `/account/reports` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Flag-gated |
| `/account/milestones` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/cashback` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/redemptions` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/travel` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Flag-gated |
| `/account/trips` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Flag-gated |
| `/account/booking` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Flag-gated |
| `/account/benefits` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/premium` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Flag-gated |
| `/account/rewards` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/account/recommendations/history` | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |

---

## Admin routes

| Route | Loading | Empty | Error | Ready | Session | Desktop | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/login` | Pending | — | Pending | Pending | Pending | Pending | Admin E2E smoke TBD |
| `/insights` | Pending | Pending | Pending | Pending | Pending | Pending | SDUI |
| `/sync` | Pending | Pending | Pending | Pending | Pending | Pending | SDUI / Import Center |
| `/catalog` | Pending | Pending | Pending | Pending | Pending | Pending | SDUI; MITC evidence rubric #22 |
| `/cards` | Pending | Pending | Pending | Pending | Pending | Pending | SDUI |
| `/rules` | Pending | Pending | Pending | Pending | Pending | Pending | SDUI |
| `/users` | Pending | Pending | Pending | Pending | Pending | Pending | SDUI |
| `/offers` | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/ai` | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/feature-flags` | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/experiments` | Pending | Pending | Pending | Pending | Pending | Pending | |
| `/analytics-events` | Pending | Pending | Pending | Pending | Pending | Pending | |

---

## Catalog ingest / crawlers (non-UI)

| Check | Status | Notes |
| --- | --- | --- |
| AI draft `rewardRules` path | Pending | Rubric adjacent to data quality DoD |
| MITC/PDF extract + Import Center evidence | Pending | Rubric #22 |
| Per-bank deep crawler + fixture (`INDIA_BANK_SOURCES`) | Pending | Rubric #24 |

---

## Completed in this delivery

- Playwright under `apps/web/e2e` with projects **desktop** (1280×720) and **pwa** (390×844)
- Helpers: `expectNoUiLeaks`, auth/consent seeding, `/api` stubs
- Specs: public smoke, stubbed account paths, session 401 (no `Unauthorized` duplication), catalog **Cards to consider**, offline banner
- Scripts: `apps/web` `e2e` / `e2e:ui`; root `e2e`; CI job snippet in `.github/workflows/ci.yml`
- This matrix template with Pass marks for the covered cells above

Remaining **Pending** cells are the full manual/agent audit pass (loading/empty/error for every route + admin overhaul smoke).
