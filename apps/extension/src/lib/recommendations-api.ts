import { extensionAuthFetch } from './extension-api';
import type { LiveRecommendation } from './messages';

/** Mirrors `browser_extension_enabled` default from @cardwise/feature-flags. */
export function isExtensionEnabled(): boolean {
  return import.meta.env.VITE_EXTENSION_ENABLED !== 'false';
}

export async function fetchBestCardRecommendation(input: {
  merchantSlug: string;
  amount: number;
}): Promise<LiveRecommendation> {
  const result = await extensionAuthFetch<Omit<LiveRecommendation, 'source'>>(
    '/api/v1/recommendations/best-card',
    {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amount,
        merchantSlug: input.merchantSlug,
      }),
    },
  );

  return { ...result, source: 'portfolio', catalogRecommendation: result.catalogRecommendation ?? null };
}
