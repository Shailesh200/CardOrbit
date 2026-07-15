import type {
  CashbackCategoryBreakdown,
  CashbackDashboard,
  CashbackForecast,
  CashbackHistoryItem,
  CashbackLedgerStatus,
} from '@cardwise/validation';

export type CashbackLedgerEntry = CashbackHistoryItem;

export function mapTransactionLedgerStatus(
  status: 'POSTED' | 'PENDING' | 'FAILED' | 'REFUND',
): CashbackLedgerStatus | null {
  switch (status) {
    case 'POSTED':
      return 'CREDITED';
    case 'PENDING':
      return 'PENDING';
    case 'REFUND':
      return 'REVERSED';
    default:
      return null;
  }
}

export function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function previousMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
}

export function buildCashbackDashboard(
  entries: CashbackLedgerEntry[],
  walletCashbackInr: number | null,
  periodLabel: string,
  transactionCount: number,
  eligibleTransactionCount: number,
  today = new Date(),
): CashbackDashboard {
  const currentMonthStart = monthStart(today);
  const currentMonthEnd = monthEnd(today);

  let totalEarnedInr = 0;
  let pendingCashbackInr = 0;
  let creditedCashbackInr = 0;
  let monthlyCashbackInr = 0;

  for (const entry of entries) {
    const at = new Date(entry.transactedAt);
    totalEarnedInr += entry.cashbackInr;

    if (entry.ledgerStatus === 'PENDING') {
      pendingCashbackInr += entry.cashbackInr;
    }
    if (entry.ledgerStatus === 'CREDITED') {
      creditedCashbackInr += entry.cashbackInr;
    }
    if (entry.ledgerStatus === 'CREDITED' && at >= currentMonthStart && at <= currentMonthEnd) {
      monthlyCashbackInr += entry.cashbackInr;
    }
  }

  return {
    totalEarnedInr: roundInr(totalEarnedInr),
    pendingCashbackInr: roundInr(pendingCashbackInr),
    creditedCashbackInr: roundInr(creditedCashbackInr),
    monthlyCashbackInr: roundInr(monthlyCashbackInr),
    walletCashbackInr: walletCashbackInr != null ? roundInr(walletCashbackInr) : null,
    transactionCount,
    eligibleTransactionCount,
    periodLabel,
  };
}

export function buildCategoryBreakdown(
  entries: CashbackLedgerEntry[],
): CashbackCategoryBreakdown[] {
  const grouped = new Map<
    string,
    {
      categoryLabel: string;
      creditedCashbackInr: number;
      pendingCashbackInr: number;
      totalCashbackInr: number;
      spendInr: number;
      transactionCount: number;
    }
  >();

  for (const entry of entries) {
    const bucket = grouped.get(entry.categorySlug) ?? {
      categoryLabel: entry.categoryLabel,
      creditedCashbackInr: 0,
      pendingCashbackInr: 0,
      totalCashbackInr: 0,
      spendInr: 0,
      transactionCount: 0,
    };

    bucket.totalCashbackInr += entry.cashbackInr;
    bucket.spendInr += Math.abs(entry.amountInr);
    bucket.transactionCount += 1;

    if (entry.ledgerStatus === 'CREDITED') {
      bucket.creditedCashbackInr += entry.cashbackInr;
    }
    if (entry.ledgerStatus === 'PENDING') {
      bucket.pendingCashbackInr += entry.cashbackInr;
    }

    grouped.set(entry.categorySlug, bucket);
  }

  return [...grouped.entries()]
    .map(([categorySlug, bucket]) => ({
      categorySlug,
      categoryLabel: bucket.categoryLabel,
      creditedCashbackInr: roundInr(bucket.creditedCashbackInr),
      pendingCashbackInr: roundInr(bucket.pendingCashbackInr),
      totalCashbackInr: roundInr(bucket.totalCashbackInr),
      transactionCount: bucket.transactionCount,
      effectiveRatePercent:
        bucket.spendInr > 0 ? roundInr((bucket.totalCashbackInr / bucket.spendInr) * 100) : 0,
    }))
    .sort((a, b) => b.totalCashbackInr - a.totalCashbackInr);
}

export function buildCashbackForecast(
  entries: CashbackLedgerEntry[],
  today = new Date(),
): CashbackForecast {
  const currentMonthStart = monthStart(today);
  const lastMonthStart = previousMonthStart(today);
  const lastMonthEnd = new Date(currentMonthStart.getTime() - 1);

  let currentMonthCashbackInr = 0;
  let lastMonthCashbackInr = 0;

  for (const entry of entries) {
    if (entry.ledgerStatus !== 'CREDITED') continue;
    const at = new Date(entry.transactedAt);
    if (at >= currentMonthStart) {
      currentMonthCashbackInr += entry.cashbackInr;
    } else if (at >= lastMonthStart && at <= lastMonthEnd) {
      lastMonthCashbackInr += entry.cashbackInr;
    }
  }

  const lookbackStart = new Date(today);
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - 30);

  let recentCashbackInr = 0;
  for (const entry of entries) {
    if (entry.ledgerStatus !== 'CREDITED') continue;
    const at = new Date(entry.transactedAt);
    if (at >= lookbackStart && at <= today) {
      recentCashbackInr += entry.cashbackInr;
    }
  }

  const basedOnDays = Math.max(
    1,
    Math.round((today.getTime() - lookbackStart.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const averageDailyCashbackInr = roundInr(recentCashbackInr / basedOnDays);

  const daysInMonth = monthEnd(today).getUTCDate();
  const dayOfMonth = today.getUTCDate();
  const projectedMonthlyCashbackInr = roundInr(averageDailyCashbackInr * daysInMonth);
  const onTrackVsLastMonth =
    lastMonthCashbackInr <= 0
      ? currentMonthCashbackInr > 0
      : currentMonthCashbackInr / dayOfMonth >= lastMonthCashbackInr / daysInMonth;

  return {
    projectedMonthlyCashbackInr,
    averageDailyCashbackInr,
    basedOnDays,
    onTrackVsLastMonth,
    lastMonthCashbackInr: roundInr(lastMonthCashbackInr),
    currentMonthCashbackInr: roundInr(currentMonthCashbackInr),
  };
}

export function paginateHistory(
  entries: CashbackLedgerEntry[],
  page: number,
  pageSize: number,
  filters?: { userCardId?: string; ledgerStatus?: CashbackLedgerStatus },
) {
  let filtered = entries;
  if (filters?.userCardId) {
    filtered = filtered.filter((entry) => entry.userCardId === filters.userCardId);
  }
  if (filters?.ledgerStatus) {
    filtered = filtered.filter((entry) => entry.ledgerStatus === filters.ledgerStatus);
  }

  filtered = [...filtered].sort(
    (a, b) => new Date(b.transactedAt).getTime() - new Date(a.transactedAt).getTime(),
  );

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page, pageSize };
}
