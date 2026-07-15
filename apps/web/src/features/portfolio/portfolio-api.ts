import { authFetch } from '@cardwise/auth';

import { aiSearch, type AiSearchSource } from '../search/search-api';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type CatalogCard = {
  id: string;
  name: string;
  slug: string;
  tier: string;
  annualFeeInr: string | null;
  joiningFeeInr: string | null;
  bank: { id: string; name: string; slug: string; logoUrl: string | null };
  network: { id: string; code: string; name: string };
  benefitCount: number;
  inPortfolio: boolean;
  userCardId: string | null;
};

export type PortfolioCardSummary = {
  id: string;
  creditCardId: string;
  nickname: string | null;
  isFavorite: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'REMOVED';
  addedAt: string;
  card: {
    name: string;
    slug: string;
    tier: string;
    annualFeeInr: string | null;
    bank: { id: string; name: string; slug: string };
    network: { code: string; name: string };
  };
  benefitCount: number;
  topBenefits: string[];
};

export type PortfolioCardDetail = PortfolioCardSummary & {
  statementDay: number | null;
  dueDay: number | null;
  sourceUrl: string | null;
  benefits: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    sourceUrl: string | null;
  }>;
  fees: Array<{ id: string; feeType: string; amountInr: string | null }>;
};

export type CatalogPage = {
  items: CatalogCard[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  source?: AiSearchSource;
};

export function listCatalog(params?: {
  q?: string;
  bankSlug?: string;
  offset?: number;
  limit?: number;
}): Promise<CatalogPage> {
  const q = params?.q?.trim();
  if (q) {
    return aiSearch({
      q,
      types: 'card',
      offset: params?.offset,
      limit: params?.limit,
    }).then((page) => ({
      items: (page.cards ?? []) as CatalogCard[],
      total: page.total,
      hasMore: page.hasMore,
      nextOffset: page.nextOffset,
      source: page.source,
    }));
  }

  const search = new URLSearchParams();
  if (params?.bankSlug) search.set('bankSlug', params.bankSlug);
  if (params?.offset !== undefined) search.set('offset', String(params.offset));
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return authFetch<CatalogPage>(`/api/v1/cards/catalog${qs ? `?${qs}` : ''}`, {}, API_BASE);
}

export function listPortfolio() {
  return authFetch<PortfolioCardSummary[]>('/api/v1/user-cards', {}, API_BASE);
}

export function getPortfolioCard(userCardId: string) {
  return authFetch<PortfolioCardDetail>(`/api/v1/user-cards/${userCardId}`, {}, API_BASE);
}

export function addPortfolioCard(body: { creditCardId: string; nickname?: string }) {
  return authFetch<PortfolioCardDetail>(
    '/api/v1/user-cards',
    { method: 'POST', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function updatePortfolioCard(
  userCardId: string,
  body: {
    nickname?: string | null;
    isFavorite?: boolean;
    status?: 'ACTIVE' | 'INACTIVE';
  },
) {
  return authFetch<PortfolioCardDetail>(
    `/api/v1/user-cards/${userCardId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function removePortfolioCard(userCardId: string) {
  return authFetch<{ ok: true }>(
    `/api/v1/user-cards/${userCardId}`,
    { method: 'DELETE' },
    API_BASE,
  );
}
