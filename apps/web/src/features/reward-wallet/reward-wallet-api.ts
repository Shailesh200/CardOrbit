import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type RewardBalanceKind = 'POINTS' | 'CASHBACK' | 'MILES' | 'HOTEL_POINTS';

export type RewardBalanceLine = {
  kind: RewardBalanceKind;
  availableAmount: number;
  pendingAmount: number;
  expiredAmount: number;
  expiringAmount: number;
  expiringAt: string | null;
  estimatedValueInr: number | null;
};

export type RewardWalletCardSummary = {
  userCardId: string;
  cardName: string;
  bankName: string;
  bankSlug: string;
  cardSlug: string;
  nickname: string | null;
  rewardProgramName: string | null;
  lastSyncedAt: string | null;
  totalEstimatedValueInr: number;
  balances: RewardBalanceLine[];
};

export type RewardWalletExpiringItem = {
  userCardId: string;
  cardName: string;
  kind: RewardBalanceKind;
  expiringAmount: number;
  expiringAt: string;
  estimatedValueInr: number | null;
};

export type RewardWalletOverview = {
  cardCount: number;
  totalEstimatedValueInr: number;
  totalAvailablePoints: number;
  totalCashbackInr: number;
  expiringSoon: RewardWalletExpiringItem[];
  cards: RewardWalletCardSummary[];
  lastSyncedAt: string | null;
};

export const REWARD_BALANCE_KIND_LABELS: Record<RewardBalanceKind, string> = {
  POINTS: 'Reward points',
  CASHBACK: 'Cashback',
  MILES: 'Airline miles',
  HOTEL_POINTS: 'Hotel points',
};

export function getRewardWalletOverview() {
  return authFetch<RewardWalletOverview>(`${API_BASE}/api/v1/reward-wallet`);
}

export function getRewardWalletCard(userCardId: string) {
  return authFetch<RewardWalletCardSummary>(
    `${API_BASE}/api/v1/reward-wallet/cards/${encodeURIComponent(userCardId)}`,
  );
}

export function updateRewardWalletCard(
  userCardId: string,
  body: {
    balances: Array<{
      kind: RewardBalanceKind;
      availableAmount: number;
      pendingAmount?: number;
      expiredAmount?: number;
      expiringAmount?: number;
      expiringAt?: string | null;
    }>;
  },
) {
  return authFetch<RewardWalletCardSummary>(
    `${API_BASE}/api/v1/reward-wallet/cards/${encodeURIComponent(userCardId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRewardAmount(kind: RewardBalanceKind, amount: number): string {
  if (kind === 'CASHBACK') return formatInr(amount);
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}
