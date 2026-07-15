import { extensionAuthFetch } from './extension-api';

export type ExtensionMatchedOffer = {
  id: string;
  slug: string;
  title: string;
  cashbackPercent: string | null;
  bestEstimatedSavingsInr: number | null;
  isEligible: boolean;
};

type OfferMatchResponse = {
  items: ExtensionMatchedOffer[];
};

export async function fetchTopMatchedOffer(input: {
  merchantSlug: string;
  amount: number;
}): Promise<ExtensionMatchedOffer | null> {
  const params = new URLSearchParams({
    merchantSlug: input.merchantSlug,
    amountInr: String(input.amount),
    limit: '3',
  });

  const response = await extensionAuthFetch<OfferMatchResponse>(
    `/api/v1/offers/matches?${params.toString()}`,
    { method: 'GET' },
  );

  return response.items[0] ?? null;
}
