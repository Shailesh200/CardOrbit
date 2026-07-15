import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type CashbackLedgerStatus = 'EARNED' | 'PENDING' | 'CREDITED' | 'REVERSED';

export type CashbackDashboard = {
  totalEarnedInr: number;
  pendingCashbackInr: number;
  creditedCashbackInr: number;
  monthlyCashbackInr: number;
  walletCashbackInr: number | null;
  transactionCount: number;
  eligibleTransactionCount: number;
  periodLabel: string;
};

export type CashbackHistoryItem = {
  id: string;
  transactionId: string;
  userCardId: string;
  cardName: string;
  bankName: string;
  merchantName: string;
  categorySlug: string;
  categoryLabel: string;
  amountInr: number;
  cashbackInr: number;
  cashbackPercent: number | null;
  ruleName: string | null;
  ledgerStatus: CashbackLedgerStatus;
  transactedAt: string;
};

export type CashbackCategoryBreakdown = {
  categorySlug: string;
  categoryLabel: string;
  creditedCashbackInr: number;
  pendingCashbackInr: number;
  totalCashbackInr: number;
  transactionCount: number;
  effectiveRatePercent: number;
};

export type CashbackForecast = {
  projectedMonthlyCashbackInr: number;
  averageDailyCashbackInr: number;
  basedOnDays: number;
  onTrackVsLastMonth: boolean;
  lastMonthCashbackInr: number;
  currentMonthCashbackInr: number;
};

export function getCashbackDashboard() {
  return authFetch<CashbackDashboard>(`${API_BASE}/api/v1/cashback`);
}

export function getCashbackHistory(page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return authFetch<{
    items: CashbackHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
  }>(`${API_BASE}/api/v1/cashback/history?${params}`);
}

export function getCashbackCategories() {
  return authFetch<{ categories: CashbackCategoryBreakdown[]; periodLabel: string }>(
    `${API_BASE}/api/v1/cashback/categories`,
  );
}

export function getCashbackForecast() {
  return authFetch<CashbackForecast>(`${API_BASE}/api/v1/cashback/forecast`);
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export const CASHBACK_STATUS_LABELS: Record<CashbackLedgerStatus, string> = {
  EARNED: 'Earned',
  PENDING: 'Pending',
  CREDITED: 'Credited',
  REVERSED: 'Reversed',
};
