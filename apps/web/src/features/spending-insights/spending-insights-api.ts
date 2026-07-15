import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type SpendingCategoryBreakdown = {
  slug: string;
  label: string;
  sharePercent: number;
  volumeInr: number;
  inquiryCount: number;
};

export type SpendingMerchantSummary = {
  name: string;
  slug: string | null;
  volumeInr: number;
  inquiryCount: number;
};

export type SpendingInsightItem = {
  id: string;
  title: string;
  body: string;
  actionLabel: string | null;
  actionPath: string | null;
};

export type SpendingInsightsOverview = {
  totalVolumeInr: number;
  inquiryCount: number;
  periodLabel: string;
  dataSource: 'recommendation_history' | 'onboarding_profile' | 'blended' | 'transactions';
  categories: SpendingCategoryBreakdown[];
  topMerchants: SpendingMerchantSummary[];
  insights: SpendingInsightItem[];
  topCategorySlug: string | null;
  estimatedMonthlySpendInr: number | null;
};

export function getSpendingInsightsOverview() {
  return authFetch<SpendingInsightsOverview>(`${API_BASE}/api/v1/spending-insights`);
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export const DATA_SOURCE_LABELS: Record<SpendingInsightsOverview['dataSource'], string> = {
  recommendation_history: 'From your reward lookups',
  onboarding_profile: 'From your onboarding profile',
  blended: 'Blended from lookups and profile',
  transactions: 'From your imported transactions',
};
