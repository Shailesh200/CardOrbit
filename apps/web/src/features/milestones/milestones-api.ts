import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED';

export type SpendMilestoneProgress = {
  id: string;
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  ruleId: string;
  ruleName: string;
  label: string;
  period: 'monthly' | 'quarterly' | 'annual';
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  spendThresholdInr: number;
  currentSpendInr: number;
  remainingSpendInr: number;
  progressPercent: number;
  milestoneBonus: number | null;
  status: MilestoneStatus;
  transactionCount: number;
  daysRemaining: number;
};

export type AnnualFeeWaiverProgress = {
  userCardId: string;
  creditCardId: string;
  cardName: string;
  bankName: string;
  annualFeeInr: number | null;
  requiredSpendInr: number;
  currentSpendInr: number;
  remainingSpendInr: number;
  progressPercent: number;
  status: MilestoneStatus;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  daysRemaining: number;
  waiverSummary: string | null;
};

export type MilestoneForecast = {
  milestoneId: string;
  userCardId: string;
  cardName: string;
  label: string;
  estimatedCompletionDate: string | null;
  onTrack: boolean;
  averageDailySpendInr: number;
};

export function getSpendMilestones() {
  return authFetch<{
    spendMilestones: SpendMilestoneProgress[];
    achievedCount: number;
    inProgressCount: number;
  }>(`${API_BASE}/api/v1/milestones`);
}

export function getAnnualFeeWaiverProgress() {
  return authFetch<{
    items: AnnualFeeWaiverProgress[];
    qualifiedCount: number;
  }>(`${API_BASE}/api/v1/milestones/annual-fee-waiver`);
}

export function getMilestoneForecast() {
  return authFetch<{ forecasts: MilestoneForecast[] }>(`${API_BASE}/api/v1/milestones/forecast`);
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  ACHIEVED: 'Achieved',
};
