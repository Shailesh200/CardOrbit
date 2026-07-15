import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type MatchedOfferCard = {
  creditCardId: string;
  cardSlug: string;
  cardName: string;
  bankName: string;
  userCardId: string | null;
  estimatedSavingsInr: number | null;
};

export type MatchedOffer = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: 'MERCHANT' | 'BANK' | 'CARD';
  cashbackPercent: string | null;
  capInr: string | null;
  termsSummary: string | null;
  validFrom: string;
  validUntil: string | null;
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'HISTORICAL';
  merchants: Array<{ id: string; slug: string; name: string }>;
  eligibleCards: MatchedOfferCard[];
  bestEstimatedSavingsInr: number | null;
  isEligible: boolean;
  ineligibilityReason: string | null;
};

export type OfferMatchResponse = {
  items: MatchedOffer[];
  total: number;
  merchantSlug: string | null;
  amountInr: number | null;
};

export function listMatchedOffers(params?: {
  merchantSlug?: string;
  amountInr?: number;
  limit?: number;
  status?: 'active' | 'historical';
}) {
  const search = new URLSearchParams();
  if (params?.merchantSlug) search.set('merchantSlug', params.merchantSlug);
  if (params?.amountInr != null) search.set('amountInr', String(params.amountInr));
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  return authFetch<OfferMatchResponse>(`/api/v1/offers${qs ? `?${qs}` : ''}`, {}, API_BASE);
}

export function getOfferDetail(slug: string, amountInr?: number) {
  const search = amountInr != null ? `?amountInr=${amountInr}` : '';
  return authFetch<{ found: true; offer: MatchedOffer } | { found: false; slug: string }>(
    `/api/v1/offers/${slug}${search}`,
    {},
    API_BASE,
  );
}
