import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type TransactionStatus = 'POSTED' | 'PENDING' | 'FAILED' | 'REFUND';
export type TransactionSource = 'MANUAL' | 'CSV_IMPORT' | 'GMAIL_SYNC';

export type TransactionSummary = {
  id: string;
  userCardId: string;
  cardName: string;
  bankName: string;
  amountInr: number;
  currency: string;
  merchantName: string;
  merchantSlug: string | null;
  categorySlug: string;
  categoryLabel: string;
  status: TransactionStatus;
  source: TransactionSource;
  transactedAt: string;
  createdAt: string;
};

export type TransactionListResponse = {
  items: TransactionSummary[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalVolumeInr: number;
    transactionCount: number;
    categoryCounts: Array<{ slug: string; label: string; count: number }>;
  };
};

export type TransactionImportResult = {
  imported: number;
  skipped: number;
  errors: Array<{ line: number; message: string }>;
};

export type ListTransactionsParams = {
  userCardId?: string;
  categorySlug?: string;
  status?: TransactionStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export function listTransactions(params: ListTransactionsParams = {}) {
  const query = new URLSearchParams();
  if (params.userCardId) query.set('userCardId', params.userCardId);
  if (params.categorySlug) query.set('categorySlug', params.categorySlug);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return authFetch<TransactionListResponse>(`${API_BASE}/api/v1/transactions${suffix}`);
}

export function createTransaction(input: {
  userCardId: string;
  amountInr: number;
  merchantName: string;
  categorySlug?: string;
  transactedAt: string;
  notes?: string;
}) {
  return authFetch<TransactionSummary>(`${API_BASE}/api/v1/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function importTransactionsCsv(input: { csv: string; defaultUserCardId?: string }) {
  return authFetch<TransactionImportResult>(`${API_BASE}/api/v1/transactions/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  POSTED: 'Posted',
  PENDING: 'Pending',
  FAILED: 'Failed',
  REFUND: 'Refund',
};

export const CSV_IMPORT_TEMPLATE = `date,amount,merchant,category,user_card_id,reference
2026-06-01,1500,Swiggy,dining,YOUR_CARD_ID,txn-001
2026-06-02,3200,Amazon,online,YOUR_CARD_ID,txn-002`;
