import { describe, expect, it } from 'vitest';

import {
  buildComparison,
  buildMerchantBreakdown,
  buildReportsHub,
  buildSpendingSection,
  filterTxns,
  resolveReportWindow,
  sectionToCsv,
  sumVolume,
  type ReportTxnRow,
} from '../reports.builder';

function txn(
  partial: Partial<ReportTxnRow> & Pick<ReportTxnRow, 'id' | 'amountInr'>,
): ReportTxnRow {
  return {
    userCardId: 'card-1',
    merchantName: 'Swiggy',
    categorySlug: 'dining',
    categoryLabel: 'Dining',
    bankName: 'HDFC',
    cardName: 'Atlas',
    transactedAt: new Date('2026-07-10T00:00:00.000Z'),
    ...partial,
  };
}

describe('resolveReportWindow', () => {
  it('resolves 90d window with prior period', () => {
    const window = resolveReportWindow({ period: '90d' }, new Date('2026-07-14T12:00:00.000Z'));
    expect(window.periodLabel).toBe('Last 90 days');
    expect(window.from.getTime()).toBeLessThan(window.to.getTime());
    expect(window.previousTo.getTime()).toBeLessThan(window.from.getTime());
  });
});

describe('spending builders', () => {
  const current = [
    txn({ id: '1', amountInr: 1000, merchantName: 'Swiggy' }),
    txn({
      id: '2',
      amountInr: 3000,
      merchantName: 'Amazon',
      categorySlug: 'shopping',
      categoryLabel: 'Shopping',
      bankName: 'Axis',
    }),
  ];
  const previous = [txn({ id: '3', amountInr: 2000, transactedAt: new Date('2026-04-01') })];

  it('builds spending section with MoM comparison', () => {
    const section = buildSpendingSection({
      type: 'monthly_spending',
      periodLabel: 'Last 90 days',
      current,
      previous,
    });
    expect(section.kpis[0]?.value).toContain('4,000');
    expect(section.comparison?.direction).toBe('up');
    expect(section.breakdown.length).toBeGreaterThan(0);
  });

  it('filters by card and builds merchant rows', () => {
    const rows = filterTxns(
      [...current, txn({ id: '4', userCardId: 'card-2', amountInr: 500, merchantName: 'Uber' })],
      new Date('2026-01-01'),
      new Date('2026-12-31'),
      'card-1',
    );
    expect(sumVolume(rows)).toBe(4000);
    expect(buildMerchantBreakdown(rows)[0]?.label).toBe('Amazon');
  });

  it('builds comparison and CSV export content', () => {
    const comparison = buildComparison(4000, 2000, 'Spend');
    expect(comparison.changePercent).toBe(100);
    expect(comparison.direction).toBe('up');

    const section = buildSpendingSection({
      type: 'category_analysis',
      periodLabel: 'Last 90 days',
      current,
      previous,
    });
    const csv = sectionToCsv(section);
    expect(csv).toContain('category_analysis');
    expect(csv).toContain('Dining');
  });

  it('builds hub payload', () => {
    const hub = buildReportsHub({
      generatedAt: '2026-07-14T00:00:00.000Z',
      periodLabel: 'Last 90 days',
      spendCurrent: 4000,
      spendPrevious: 2000,
      cashbackEarnedInr: 250,
      walletValueInr: 5000,
      milestoneInProgress: 2,
      sections: [],
    });
    expect(hub.availableReports.length).toBeGreaterThan(0);
    expect(hub.insights[0]?.id).toBe('milestones');
    expect(hub.kpis.some((kpi) => kpi.id === 'spend')).toBe(true);
  });
});
