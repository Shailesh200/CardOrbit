# @cardwise/analytics

Centralized product analytics for CardWise. **Never call PostHog from feature code** — use this package only.

## Setup

```ts
import { initAnalytics, trackEvent, AnalyticsEvent } from '@cardwise/analytics';

initAnalytics({
  apiKey: process.env.POSTHOG_API_KEY,
  host: process.env.POSTHOG_HOST,
});

trackEvent(AnalyticsEvent.USER_REGISTERED, {
  method: 'email',
}, { distinctId: userId });
```

Without `POSTHOG_API_KEY`, events are stored in an in-memory sink (local/tests). Inspect with `getMemoryEvents()`.

## Required Phase 0 events

| Event | Properties |
|-------|------------|
| `USER_REGISTERED` | `method`, `source?` |
| `CARD_ADDED` | `cardId`, `bankId?` |
| `RECOMMENDATION_REQUESTED` | merchant/category/amount/cards |

Full catalog includes card/merchant/offer/recommendation events from bootstrap §5.1.

## PostHog dashboards (M-023 / M-034)

Six product dashboards are defined in `posthog/dashboards.ts` and synced via:

```bash
bun run analytics:sync-dashboards
```

See [`posthog/README.md`](./posthog/README.md) for credentials and triage signals (`CARD_DATA_GAP`, failed merchant searches).

## Scripts

```bash
bun run build
bun run typecheck
bun run test
```
