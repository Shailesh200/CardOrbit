import { useEffect, useState } from 'react';

import { fetchBrandRegistry, type BrandRegistry } from '../lib/brand-assets';

type BrandRegistryState =
  | { status: 'loading' }
  | { status: 'ready'; registry: BrandRegistry }
  | { status: 'error' };

export function useBrandRegistry(): BrandRegistryState {
  const [state, setState] = useState<BrandRegistryState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetchBrandRegistry()
      .then((registry) => {
        if (!cancelled) setState({ status: 'ready', registry });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
