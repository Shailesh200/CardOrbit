import { useEffect, useState } from 'react';

import {
  fetchBestCardRecommendation,
  type LiveRecommendation,
} from '@features/recommendations/recommendations-api';

type UseRecommendationParams = {
  merchantSlug: string;
  categorySlug?: string | null;
  amount: number;
  enabled?: boolean;
  immediate?: boolean;
};

type RecommendationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: LiveRecommendation }
  | { status: 'error'; message: string };

const DEBOUNCE_MS = 400;

/** Fetches portfolio ranking for a merchant + spend amount (debounced). */
export function useRecommendation({
  merchantSlug,
  categorySlug,
  amount,
  enabled = true,
  immediate = false,
}: UseRecommendationParams): RecommendationState {
  const [state, setState] = useState<RecommendationState>(
    enabled && immediate ? { status: 'loading' } : { status: 'idle' },
  );

  useEffect(() => {
    if (!enabled || !merchantSlug || amount <= 0) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    let watchdog: number | undefined;

    const run = () => {
      setState({ status: 'loading' });
      // Avoid infinite skeleton when API is restarting / hung.
      watchdog = window.setTimeout(() => {
        if (!cancelled) {
          setState({ status: 'error', message: 'Recommendation request timed out' });
        }
      }, 8_000);

      fetchBestCardRecommendation({ merchantSlug, categorySlug, amount })
        .then((data) => {
          if (!cancelled) setState({ status: 'ready', data });
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setState({
              status: 'error',
              message: error instanceof Error ? error.message : 'Recommendation failed',
            });
          }
        })
        .finally(() => {
          if (watchdog !== undefined) window.clearTimeout(watchdog);
        });
    };

    if (immediate) {
      run();
      return () => {
        cancelled = true;
        if (watchdog !== undefined) window.clearTimeout(watchdog);
      };
    }

    timer = window.setTimeout(run, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      if (watchdog !== undefined) window.clearTimeout(watchdog);
    };
  }, [merchantSlug, categorySlug, amount, enabled, immediate]);

  return state;
}
