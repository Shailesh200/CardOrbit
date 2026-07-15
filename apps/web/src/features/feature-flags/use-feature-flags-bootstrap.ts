import { useEffect } from 'react';

import { getAccessToken } from '@cardwise/auth';
import { loadFeatureFlagsFromApi, readCachedFeatureFlags } from '@cardwise/feature-flags/browser';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useFeatureFlagsBootstrap(): void {
  useEffect(() => {
    void loadFeatureFlagsFromApi({
      apiBase: API_BASE,
      getAuthHeaders: () => {
        const headers: Record<string, string> = {};
        const token = getAccessToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const cached = readCachedFeatureFlags();
        if (cached?.distinctId) {
          headers['x-cardwise-distinct-id'] = cached.distinctId;
        }
        return headers;
      },
    }).catch(() => {
      // Cached flags or defaults remain in effect.
    });
  }, []);
}
