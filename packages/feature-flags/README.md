# @cardwise/feature-flags

PostHog feature-flag abstraction for CardWise. Feature code must use this package — never read flags from PostHog directly.

## Resolution order

1. **Admin portal (DB)** — primary source; API and worker refresh every ~30s
2. **PostHog** — when `POSTHOG_API_KEY` is set and local-only mode is off
3. **Phase 0 defaults** — fallback when no DB row exists

`CARDWISE_FLAG_*` environment variables are **not** read. Manage flags in **Admin → Feature flags**.

## Phase 0 flags

| Flag | Default |
|------|---------|
| `browser_extension_enabled` | `true` |
| `ai_platform_enabled` | `false` |
| `ai_assistant_enabled` | `false` |
| `travel_booking_enabled` | `false` |
| `premium_features_enabled` | `false` |

## Usage

```ts
import {
  initFeatureFlags,
  isEnabled,
  FeatureFlag,
  useFeatureFlag,
} from '@cardwise/feature-flags';

initFeatureFlags({ useLocalOnly: true });

const aiOn = await isEnabled(FeatureFlag.AI_ASSISTANT_ENABLED, userId);

// React
const extensionOn = useFeatureFlag(FeatureFlag.BROWSER_EXTENSION_ENABLED);
```

## Scripts

```bash
bun run build
bun run typecheck
bun run test
```
