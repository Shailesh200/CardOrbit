import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type StatementStatus = 'OPEN' | 'PAID' | 'OVERDUE' | 'PARTIAL';
export type BillDisplayStatus = 'UPCOMING' | 'OPEN' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'PROCESSING';

export type StatementSummary = {
  id: string;
  userCardId: string;
  cardName: string;
  bankName: string;
  periodStart: string;
  periodEnd: string;
  statementDate: string;
  dueDate: string;
  totalAmountInr: number;
  minimumDueInr: number;
  status: StatementStatus;
  transactionCount: number;
  spendInPeriodInr: number;
};

export type BillSummary = {
  id: string;
  kind: 'statement' | 'upcoming';
  userCardId: string;
  cardName: string;
  bankName: string;
  dueDate: string;
  daysUntilDue: number;
  totalDueInr: number | null;
  minimumDueInr: number | null;
  estimatedSpendInr: number | null;
  status: BillDisplayStatus;
  statementId: string | null;
  statementDay: number | null;
  dueDay: number | null;
};

export type BillListResponse = {
  items: BillSummary[];
  overdueCount: number;
  upcomingCount: number;
};

export type StatementListResponse = {
  items: StatementSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type BillingCalendarResponse = {
  year: number;
  month: number;
  days: Array<{
    date: string;
    dueBills: Array<{
      billId: string;
      cardName: string;
      amountInr: number | null;
      status: BillDisplayStatus;
    }>;
    statementDates: Array<{ userCardId: string; cardName: string }>;
  }>;
};

export function listBills(includePaid = false) {
  const query = includePaid ? '?includePaid=true' : '';
  return authFetch<BillListResponse>(`${API_BASE}/api/v1/bills${query}`);
}

export function listStatements(params?: { userCardId?: string; year?: number; month?: number }) {
  const query = new URLSearchParams();
  if (params?.userCardId) query.set('userCardId', params.userCardId);
  if (params?.year) query.set('year', String(params.year));
  if (params?.month) query.set('month', String(params.month));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return authFetch<StatementListResponse>(`${API_BASE}/api/v1/statements${suffix}`);
}

export function createStatement(input: {
  userCardId: string;
  periodStart: string;
  periodEnd: string;
  statementDate: string;
  dueDate: string;
  totalAmountInr: number;
  minimumDueInr: number;
}) {
  return authFetch<StatementSummary>(`${API_BASE}/api/v1/statements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function recordBillPayment(
  billId: string,
  input: { amountInr: number; paidAt: string; notes?: string },
) {
  return authFetch(`${API_BASE}/api/v1/bills/${encodeURIComponent(billId)}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function getBillingCalendar(year: number, month: number) {
  return authFetch<BillingCalendarResponse>(
    `${API_BASE}/api/v1/billing/calendar?year=${year}&month=${month}`,
  );
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export const BILL_STATUS_LABELS: Record<BillDisplayStatus, string> = {
  UPCOMING: 'Upcoming',
  OPEN: 'Due',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  PARTIAL: 'Partially paid',
  PROCESSING: 'Processing',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
