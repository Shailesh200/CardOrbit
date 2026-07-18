import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';

import { isAuthenticated } from '@cardwise/auth';

/**
 * SWR wrapper that only fetches when the user has a session.
 * Pass your existing API function as the fetcher — keys stay cacheable.
 */
export function useAuthSWR<T>(
  key: string | readonly unknown[] | null,
  fetcher: () => Promise<T>,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  const authed = typeof window !== 'undefined' && isAuthenticated();
  const resolvedKey = authed && key != null ? key : null;

  return useSWR<T>(resolvedKey, fetcher, {
    revalidateOnFocus: true,
    keepPreviousData: true,
    ...config,
  });
}
