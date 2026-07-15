import { describe, expect, it } from 'vitest';

import {
  buildCashbackDashboard,
  buildCashbackForecast,
  buildCategoryBreakdown,
  mapTransactionLedgerStatus,
  paginateHistory,
} from '../cashback-aggregation';
import type { CashbackLedgerEntry } from '../cashback-aggregation';

const sampleEntries: CashbackLedgerEntry[] = [
  {
    id: '1:cashback',
    transactionId: '1',
    userCardId: 'card-1',
    cardName: 'Cashback Card',
    bankName: 'Test Bank',
    merchantName: 'Amazon',
    categorySlug: 'shopping',
    categoryLabel: 'Shopping',
    amountInr: 10_000,
    cashbackInr: 500,
    cashbackPercent: 5,
    ruleName: 'Online cashback',
    ledgerStatus: 'CREDITED',
    transactedAt: '2026-07-10T12:00:00.000Z',
  },
  {
    id: '2:cashback',
    transactionId: '2',
    userCardId: 'card-1',
    cardName: 'Cashback Card',
    bankName: 'Test Bank',
    merchantName: 'Swiggy',
    categorySlug: 'dining',
    categoryLabel: 'Dining',
    amountInr: 2_000,
    cashbackInr: 100,
    cashbackPercent: 5,
    ruleName: 'Online cashback',
    ledgerStatus: 'PENDING',
    transactedAt: '2026-07-11T12:00:00.000Z',
  },
  {
    id: '3:cashback',
    transactionId: '3',
    userCardId: 'card-1',
    cardName: 'Cashback Card',
    bankName: 'Test Bank',
    merchantName: 'Amazon',
    categorySlug: 'shopping',
    categoryLabel: 'Shopping',
    amountInr: -1_000,
    cashbackInr: -50,
    cashbackPercent: 5,
    ruleName: 'Online cashback',
    ledgerStatus: 'REVERSED',
    transactedAt: '2026-07-09T12:00:00.000Z',
  },
];

describe('mapTransactionLedgerStatus', () => {
  it('maps transaction statuses to cashback ledger statuses', () => {
    expect(mapTransactionLedgerStatus('POSTED')).toBe('CREDITED');
    expect(mapTransactionLedgerStatus('PENDING')).toBe('PENDING');
    expect(mapTransactionLedgerStatus('REFUND')).toBe('REVERSED');
    expect(mapTransactionLedgerStatus('FAILED')).toBeNull();
  });
});

describe('buildCashbackDashboard', () => {
  it('aggregates earned, pending, credited, and monthly totals', () => {
    const dashboard = buildCashbackDashboard(
      sampleEntries,
      450,
      'Last 90 days',
      10,
      8,
      new Date('2026-07-12T12:00:00.000Z'),
    );

    expect(dashboard.totalEarnedInr).toBe(550);
    expect(dashboard.pendingCashbackInr).toBe(100);
    expect(dashboard.creditedCashbackInr).toBe(500);
    expect(dashboard.monthlyCashbackInr).toBe(500);
    expect(dashboard.walletCashbackInr).toBe(450);
    expect(dashboard.transactionCount).toBe(10);
    expect(dashboard.eligibleTransactionCount).toBe(8);
  });
});

describe('buildCategoryBreakdown', () => {
  it('groups cashback by category and computes effective rates', () => {
    const categories = buildCategoryBreakdown(sampleEntries);
    const shopping = categories.find((row) => row.categorySlug === 'shopping');

    expect(shopping?.totalCashbackInr).toBe(450);
    expect(shopping?.creditedCashbackInr).toBe(500);
    expect(shopping?.transactionCount).toBe(2);
    expect(categories[0]?.categorySlug).toBe('shopping');
  });
});

describe('buildCashbackForecast', () => {
  it('projects monthly cashback from recent credited earnings', () => {
    const forecast = buildCashbackForecast(sampleEntries, new Date('2026-07-12T12:00:00.000Z'));

    expect(forecast.averageDailyCashbackInr).toBeGreaterThan(0);
    expect(forecast.projectedMonthlyCashbackInr).toBeGreaterThan(0);
    expect(forecast.currentMonthCashbackInr).toBe(500);
  });
});

describe('paginateHistory', () => {
  it('filters and paginates cashback history', () => {
    const page = paginateHistory(sampleEntries, 1, 1, { ledgerStatus: 'CREDITED' });

    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.ledgerStatus).toBe('CREDITED');
  });
});
