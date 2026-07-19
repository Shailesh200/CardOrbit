# CardWise PostHog Dashboards (M-023)

Phase 1 product analytics dashboards for engineering and product triage. All charts derive from typed events in `@cardwise/analytics` — never from ad-hoc PostHog captures.

## Dashboards

| Dashboard | Key | Primary events |
|-----------|-----|----------------|
| User Metrics | `user-metrics` | `USER_REGISTERED`, `CARD_ADDED`, `ONBOARDING_*`, retention |
| Recommendation Quality | `recommendation-quality` | `RECOMMENDATION_*` |
| Merchant Intelligence | `merchant-intelligence` | `MERCHANT_SEARCHED` (incl. `searchFailed`) |
| Card Intelligence | `card-intelligence` | `CARD_ADDED`, `CARD_DATA_GAP`, reco clicks |
| Traffic & Page Visits | `traffic` | `$pageview`, `SESSION_STARTED` |

Definitions live in [`dashboards.ts`](./dashboards.ts).

## Sync to PostHog Cloud

1. Create a [PostHog personal API key](https://posthog.com/docs/api/overview) with `insight:write` and `dashboard:write`.
2. Copy your **Project ID** from PostHog project settings.
3. Set env vars (add to `.env` locally — do not commit keys):

```bash
POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_PROJECT_ID=12345
POSTHOG_HOST=https://app.posthog.com   # optional
```

4. Run:

```bash
bun run analytics:sync-dashboards          # create dashboards + insights
bun run analytics:sync-dashboards -- --dry-run
```

The script is idempotent on dashboard **names** but will add new insights on each run if titles differ. Re-run after changing `dashboards.ts`.

## Data gap signals (triage)

| Signal | Event | Property |
|--------|-------|----------|
| Failed merchant search | `MERCHANT_SEARCHED` | `searchFailed: true`, `resultCount: 0` |
| Missing reward rule | `CARD_DATA_GAP` | `gapType: missing_reward_rule` |
| Missing benefit data | `CARD_DATA_GAP` | `gapType: missing_benefit_data` |

`CARD_DATA_GAP` is emitted from the recommendation engine when evaluating a user's portfolio.

## Local development

Without PostHog credentials, events accumulate in the in-memory sink:

```ts
import { getMemoryEvents } from '@cardwise/analytics';
console.log(getMemoryEvents());
```

## Related docs

- Bootstrap §5.1 — event catalog
- Bootstrap §5.1.1 — dashboard requirements
- `plans/00_MASTER_DEVELOPMENT_PLAN.md` — M-023
