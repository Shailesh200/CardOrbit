import { useEffect, useState } from 'react';

import {
  fetchLiveRecommendation,
  type LiveRecommendation,
} from '@features/recommendations/recommendations-api';
import { useAuthSession } from './useAuthSession';

type LiveRecommendationState =
  | { status: 'loading' }
  | { status: 'ready'; data: LiveRecommendation }
  | { status: 'error' };

/** Loads the home hero recommendation from the engine (portfolio when signed in). */
export function useLiveRecommendation(): LiveRecommendationState {
  const authed = useAuthSession();
  const [state, setState] = useState<LiveRecommendationState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchLiveRecommendation(authed)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [authed]);

  return state;
}
