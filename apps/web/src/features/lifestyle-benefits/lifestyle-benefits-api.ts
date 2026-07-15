import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type LifestyleCardProfile = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  networkName: string;
  insuranceSummary: string | null;
  fuelSummary: string | null;
  diningSummary: string | null;
  emiSummary: string | null;
  insuranceBenefits: Array<{
    id: string;
    title: string;
    description: string | null;
    coverageLabel: string | null;
    coverageType: 'TRAVEL' | 'MEDICAL' | 'PURCHASE' | 'GENERAL' | null;
  }>;
  fuelBenefits: Array<{
    id: string;
    title: string;
    description: string | null;
    surchargeWaiver: boolean;
    waiverCapLabel: string | null;
  }>;
  diningBenefits: Array<{
    id: string;
    title: string;
    description: string | null;
    discountPercent: number | null;
    programName: string | null;
  }>;
  emiBenefits: Array<{
    id: string;
    title: string;
    description: string | null;
    noCostEmi: boolean;
    interestRateLabel: string | null;
    maxTenureMonths: number | null;
  }>;
  lifestyleRewardRules: Array<{
    id: string;
    name: string;
    spendCategoryCode: string | null;
    rewardMultiplier: number | null;
    cashbackPercent: number | null;
  }>;
};

export type LifestyleSpendingSummary = {
  totalVolumeInr: number;
  transactionCount: number;
  periodLabel: string;
  topMerchants: Array<{ merchantName: string; volumeInr: number; count: number }>;
};

export type LifestyleBenefitsOverview = {
  cardCount: number;
  insuranceCardCount: number;
  fuelCardCount: number;
  diningCardCount: number;
  emiCardCount: number;
  bestFuelCardUserCardId: string | null;
  bestDiningCardUserCardId: string | null;
  cards: LifestyleCardProfile[];
  fuelSpending: LifestyleSpendingSummary;
  diningSpending: LifestyleSpendingSummary;
};

export function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getLifestyleBenefitsOverview() {
  return authFetch<LifestyleBenefitsOverview>(`${API_BASE}/api/v1/lifestyle-benefits`);
}
