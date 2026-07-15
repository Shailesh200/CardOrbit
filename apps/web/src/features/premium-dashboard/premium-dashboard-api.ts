import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type PremiumCardRoi = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  tier: string;
  annualFeeInr: number | null;
  walletValueInr: number;
  spendVolumeInr: number;
  estimatedBenefitsValueInr: number;
  milestoneBonusPotentialInr: number;
  annualSavingsInr: number;
  netRoiInr: number;
  rewardEfficiencyPercent: number;
  benefitCount: number;
  loungeCount: number;
  insuranceCount: number;
  feeWaiverProgressPercent: number | null;
};

export type PremiumRecommendation = {
  kind: 'ROI' | 'FEE_WAIVER' | 'EFFICIENCY' | 'MILESTONE' | 'USAGE';
  title: string;
  description: string;
  userCardId: string | null;
  cardName: string | null;
  priorityRank: number;
  estimatedValueInr: number | null;
};

export type PremiumDashboardOverview = {
  premiumCardCount: number;
  totalAnnualFeesInr: number;
  totalWalletValueInr: number;
  totalEstimatedBenefitsInr: number;
  totalAnnualSavingsInr: number;
  portfolioNetRoiInr: number;
  averageRewardEfficiencyPercent: number;
  bestRoiCardUserCardId: string | null;
  cards: PremiumCardRoi[];
  recommendations: PremiumRecommendation[];
  summary: string;
  periodLabel: string;
};

export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getPremiumDashboardOverview() {
  return authFetch<PremiumDashboardOverview>(`${API_BASE}/api/v1/premium-dashboard`);
}
