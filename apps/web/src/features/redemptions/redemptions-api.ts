import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type RedemptionOptionType =
  | 'STATEMENT_CREDIT'
  | 'GIFT_CARD'
  | 'FLIGHTS'
  | 'HOTELS'
  | 'MERCHANDISE'
  | 'CASHBACK'
  | 'PARTNER_TRANSFER';

export type RewardBalanceKind = 'POINTS' | 'CASHBACK' | 'MILES' | 'HOTEL_POINTS';

export type RedemptionCatalogOption = {
  id: string;
  userCardId: string;
  cardName: string;
  bankName: string;
  balanceKind: RewardBalanceKind;
  optionType: RedemptionOptionType;
  optionLabel: string;
  availablePoints: number;
  pointValueInr: number;
  valueMultiplier: number;
  effectiveRatePercent: number;
  estimatedValueInr: number;
  minPointsRequired: number;
  eligible: boolean;
  ineligibleReason: string | null;
};

export type RedemptionRecommendation = RedemptionCatalogOption & {
  priorityRank: number;
  rationale: string;
  expiryBoost: boolean;
};

export type RedemptionHistoryItem = {
  id: string;
  userCardId: string;
  cardName: string;
  bankName: string;
  balanceKind: RewardBalanceKind;
  optionType: RedemptionOptionType;
  optionLabel: string;
  pointsRedeemed: number;
  estimatedValueInr: number;
  effectiveRatePercent: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  notes: string | null;
  redeemedAt: string;
  createdAt: string;
};

export function getRedemptionCatalog() {
  return authFetch<{
    optionCount: number;
    eligibleCount: number;
    bestValueOptionId: string | null;
    options: RedemptionCatalogOption[];
  }>(`${API_BASE}/api/v1/redemptions`);
}

export function getRedemptionRecommendations() {
  return authFetch<{ recommendations: RedemptionRecommendation[]; summary: string }>(
    `${API_BASE}/api/v1/redemptions/recommendations`,
  );
}

export function getRedemptionHistory(page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return authFetch<{
    items: RedemptionHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(`${API_BASE}/api/v1/redemptions/history?${params}`);
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatPoints(kind: RewardBalanceKind, amount: number): string {
  if (kind === 'CASHBACK') return formatInr(amount);
  return amount.toLocaleString('en-IN');
}
