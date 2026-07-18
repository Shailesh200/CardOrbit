import { useEffect, useState } from 'react';

import {
  getClientFeatureFlag,
  loadFeatureFlagsFromApi,
  subscribeClientFeatureFlags,
} from './browser-client';
import type { FeatureFlagKey } from './flags';
import { FEATURE_FLAG_DEFAULTS } from './flags';

/**
 * React hook for feature flags (browser).
 * Reads localStorage cache, then refreshes from API.
 */
export function useFeatureFlag(flag: FeatureFlagKey, _distinctId?: string): boolean {
  const [enabled, setEnabled] = useState(() =>
    typeof window !== 'undefined' ? getClientFeatureFlag(flag) : FEATURE_FLAG_DEFAULTS[flag],
  );

  useEffect(() => {
    let cancelled = false;

    function sync() {
      if (!cancelled) {
        setEnabled(getClientFeatureFlag(flag));
      }
    }

    const unsubscribe = subscribeClientFeatureFlags(sync);

    async function resolve() {
      if (typeof window === 'undefined') {
        if (!cancelled) setEnabled(FEATURE_FLAG_DEFAULTS[flag]);
        return;
      }

      try {
        await loadFeatureFlagsFromApi();
      } catch {
        // Keep cached/default values when API is unavailable.
      }
      sync();
    }

    void resolve();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [flag]);

  return enabled;
}
