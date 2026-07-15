import { useEffect, useRef } from 'react';

import { getAccessToken } from '@cardwise/auth';

import { trackExperimentExposedClient } from '../../lib/product-analytics';

const API_BASE = import.meta.env.VITE_API_URL || '';

type ExperimentsSnapshot = {
  version: string;
  distinctId: string;
  fetchedAt: string;
  assignments: Record<string, string>;
};

export function useExperimentsBootstrap(): void {
  const exposedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    void fetch(`${API_BASE}/api/v1/experiments`, { headers })
      .then((response) => (response.ok ? (response.json() as Promise<ExperimentsSnapshot>) : null))
      .then((snapshot) => {
        if (!snapshot) return;
        for (const [experimentKey, variant] of Object.entries(snapshot.assignments)) {
          const exposureKey = `${experimentKey}:${variant}:${snapshot.version}`;
          if (exposedRef.current.has(exposureKey)) continue;
          exposedRef.current.add(exposureKey);
          trackExperimentExposedClient({
            experimentKey,
            variant,
            surface: 'web',
          });
        }
      })
      .catch(() => {
        // Experiments are optional; defaults apply server-side.
      });
  }, []);
}
