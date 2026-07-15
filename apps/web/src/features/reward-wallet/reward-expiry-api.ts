import { authFetch } from '@cardwise/auth';

import type { RewardBalanceKind } from './reward-wallet-api';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type RewardExpiryItem = {
  balanceId: string;
  userCardId: string;
  cardName: string;
  bankName: string;
  bankSlug: string;
  cardSlug: string;
  kind: RewardBalanceKind;
  expiringAmount: number;
  expiringAt: string;
  daysRemaining: number;
  estimatedValueInr: number | null;
  urgencyScore: number;
  alertWindow: number | null;
};

export type RedeemFirstItem = RewardExpiryItem & {
  priorityRank: number;
  rationale: string;
};

export type RedemptionStrategy = {
  summary: string;
  redeemFirst: RedeemFirstItem[];
  highValue: RewardExpiryItem[];
};

export type RewardExpiryIntelligence = {
  expiringSoon: RewardExpiryItem[];
  highValue: RewardExpiryItem[];
  redeemFirst: RedeemFirstItem[];
  strategy: RedemptionStrategy;
  totalExpiringValueInr: number;
  alertsDelivered: number;
};

export function getRewardExpiryIntelligence() {
  return authFetch<RewardExpiryIntelligence>(`${API_BASE}/api/v1/reward-expiry`);
}
