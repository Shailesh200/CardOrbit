import { authFetch } from '@cardwise/auth';

import { aiSearch, type AiSearchSource } from '../search/search-api';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type MerchantCategory = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
};

export type MerchantListItem = {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string; slug: string } | null;
  paymentMethods: string[];
  popularityScore: number;
  tags: string[];
};

export type MerchantDetail = MerchantListItem & {
  website: string | null;
  brandName: string | null;
  parentBrand: string | null;
  aliases: string[];
  offerCount: number;
  isFavorite: boolean;
};

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  categorySlug: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FavoriteMerchant = {
  id: string;
  merchantId: string;
  createdAt: string;
  merchant: {
    id: string;
    name: string;
    slug: string;
    category: { id: string; name: string; slug: string } | null;
  };
};

export type MerchantSearchPage = {
  items: MerchantListItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  source?: AiSearchSource;
};

export function searchMerchants(params?: {
  q?: string;
  categorySlug?: string;
  offset?: number;
  limit?: number;
}): Promise<MerchantSearchPage> {
  const q = params?.q?.trim();
  if (q && !params?.categorySlug) {
    return aiSearch({
      q,
      types: 'merchant',
      offset: params?.offset,
      limit: params?.limit,
    }).then((page) => ({
      items: (page.merchants ?? []) as MerchantListItem[],
      total: page.total,
      hasMore: page.hasMore,
      nextOffset: page.nextOffset,
      source: page.source,
    }));
  }

  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.categorySlug) search.set('categorySlug', params.categorySlug);
  if (params?.offset !== undefined) search.set('offset', String(params.offset));
  if (params?.limit !== undefined) search.set('limit', String(params.limit));
  const qs = search.toString();
  return authFetch<MerchantSearchPage>(
    `/api/v1/merchants/search${qs ? `?${qs}` : ''}`,
    {},
    API_BASE,
  );
}

export function listMerchantCategories() {
  return authFetch<MerchantCategory[]>('/api/v1/merchants/categories', {}, API_BASE);
}

export function listPopularMerchants() {
  return authFetch<MerchantListItem[]>('/api/v1/merchants/popular', {}, API_BASE);
}

export function getMerchant(slug: string) {
  return authFetch<MerchantDetail>(`/api/v1/merchants/${slug}`, {}, API_BASE);
}

export function listFavoriteMerchants() {
  return authFetch<FavoriteMerchant[]>('/api/v1/merchants/favorites', {}, API_BASE);
}

export function addFavoriteMerchant(body: { merchantId?: string; slug?: string }) {
  return authFetch<FavoriteMerchant>(
    '/api/v1/merchants/favorites',
    { method: 'POST', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function removeFavoriteMerchant(merchantId: string) {
  return authFetch<void>(
    `/api/v1/merchants/favorites/${merchantId}`,
    { method: 'DELETE' },
    API_BASE,
  );
}

export function listSavedSearches() {
  return authFetch<SavedSearch[]>('/api/v1/merchants/saved-searches', {}, API_BASE);
}

export function createSavedSearch(body: {
  name: string;
  query?: string;
  categorySlug?: string | null;
}) {
  return authFetch<SavedSearch>(
    '/api/v1/merchants/saved-searches',
    { method: 'POST', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function deleteSavedSearch(savedSearchId: string) {
  return authFetch<void>(
    `/api/v1/merchants/saved-searches/${savedSearchId}`,
    { method: 'DELETE' },
    API_BASE,
  );
}
