import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type AiSearchSource = 'semantic' | 'keyword';

export type AiSearchResponse = {
  query: string;
  source: AiSearchSource;
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  cards?: Array<Record<string, unknown>>;
  merchants?: Array<Record<string, unknown>>;
};

export type AiSearchStatus = {
  enabled: boolean;
  configured: boolean;
  ready: boolean;
  indexed: {
    model: string;
    cards: number;
    merchants: number;
    total: number;
  };
};

export function aiSearch(params: {
  q: string;
  types: 'card' | 'merchant' | 'card,merchant';
  offset?: number;
  limit?: number;
}) {
  const search = new URLSearchParams();
  search.set('q', params.q);
  search.set('types', params.types);
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  return authFetch<AiSearchResponse>(`/api/v1/search/ai?${search.toString()}`, {}, API_BASE);
}

export function getAiSearchStatus() {
  return authFetch<AiSearchStatus>('/api/v1/search/ai/status', {}, API_BASE);
}
