import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const MIN_COMPARISON_CARDS = 2;
export const MAX_COMPARISON_CARDS = 4;

export type ComparisonColumn = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  nickname: string | null;
  bankName: string;
  bankSlug: string;
  cardSlug: string;
  tier: string;
  isFavorite: boolean;
};

export type ComparisonRow = {
  id: string;
  group: 'fees' | 'rewards' | 'benefits' | 'lifestyle';
  label: string;
  values: Record<string, string>;
  bestUserCardId: string | null;
  highlight: 'lowest' | 'highest' | 'most' | null;
  isDifferent: boolean;
};

export type CardComparisonResult = {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  recommendedUserCardId: string | null;
};

export function comparePortfolioCards(userCardIds: string[]) {
  return authFetch<CardComparisonResult>(`${API_BASE}/api/v1/card-comparison`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userCardIds }),
  });
}

export function parseComparisonIdsParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARISON_CARDS);
}

export function buildComparisonIdsParam(ids: string[]): string {
  return ids.join(',');
}

export const COMPARISON_GROUP_LABELS: Record<ComparisonRow['group'], string> = {
  fees: 'Fees',
  rewards: 'Rewards',
  benefits: 'Benefits',
  lifestyle: 'Lifestyle',
};
