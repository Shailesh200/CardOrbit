import { describe, expect, it } from 'vitest';

import {
  blendCategoryBreakdowns,
  buildCategoryBreakdownFromHistory,
  buildCategoryBreakdownFromProfile,
  buildSpendingInsights,
  buildTopMerchants,
  computeOptimizationOpportunity,
  estimateMonthlySpendFromBand,
} from '../spending-insights-analytics';

describe('spending insights analytics', () => {
  it('aggregates category shares from recommendation history', () => {
    const breakdown = buildCategoryBreakdownFromHistory([
      { amountInr: 5000, categorySlug: 'dining', merchantSlug: 'swiggy', merchantName: 'Swiggy' },
      { amountInr: 5000, categorySlug: 'dining', merchantSlug: 'zomato', merchantName: 'Zomato' },
      { amountInr: 10000, categorySlug: 'travel', merchantSlug: 'makemytrip', merchantName: 'MMT' },
    ]);

    expect(breakdown).toHaveLength(2);
    expect(breakdown.find((row) => row.slug === 'travel')?.sharePercent).toBe(50);
    expect(breakdown.find((row) => row.slug === 'dining')?.sharePercent).toBe(50);
  });

  it('builds profile-based breakdown from onboarding categories', () => {
    const breakdown = buildCategoryBreakdownFromProfile({
      categorySlugs: ['dining', 'travel'],
      estimatedMonthlySpendInr: 30000,
    });

    expect(breakdown).toHaveLength(2);
    expect(breakdown.every((row) => row.sharePercent === 50)).toBe(true);
    expect(breakdown[0]?.volumeInr).toBe(15000);
  });

  it('blends history and profile breakdowns', () => {
    const history = buildCategoryBreakdownFromHistory([
      { amountInr: 9000, categorySlug: 'dining', merchantSlug: null, merchantName: null },
    ]);
    const profile = buildCategoryBreakdownFromProfile({
      categorySlugs: ['dining', 'fuel'],
      estimatedMonthlySpendInr: 10000,
    });

    const blended = blendCategoryBreakdowns(history, profile);
    expect(blended.some((row) => row.slug === 'dining')).toBe(true);
    expect(blended.some((row) => row.slug === 'fuel')).toBe(true);
  });

  it('ranks top merchants by lookup volume', () => {
    const merchants = buildTopMerchants([
      { amountInr: 2000, categorySlug: 'dining', merchantSlug: 'swiggy', merchantName: 'Swiggy' },
      { amountInr: 8000, categorySlug: 'travel', merchantSlug: 'makemytrip', merchantName: 'MMT' },
    ]);

    expect(merchants[0]?.name).toBe('MMT');
    expect(merchants[0]?.volumeInr).toBe(8000);
  });

  it('never uses merchant slug as the display name', () => {
    const merchants = buildTopMerchants([
      { amountInr: 5000, categorySlug: 'dining', merchantSlug: 'swiggy', merchantName: null },
    ]);

    expect(merchants[0]?.name).toBe('Unknown merchant');
    expect(merchants[0]?.slug).toBe('swiggy');
  });

  it('estimates monthly spend from onboarding band', () => {
    expect(estimateMonthlySpendFromBand('UNDER_10K')).toBe(7500);
    expect(estimateMonthlySpendFromBand('10K_50K')).toBe(30000);
    expect(estimateMonthlySpendFromBand('50K_PLUS')).toBe(75000);
    expect(estimateMonthlySpendFromBand(undefined)).toBeNull();
  });

  it('computes optimization opportunity when uplift is meaningful', () => {
    const opportunity = computeOptimizationOpportunity({
      categorySlug: 'dining',
      monthlyCategorySpendInr: 5000,
      cards: [
        { cardName: 'Card A', ratePercent: 5 },
        { cardName: 'Card B', ratePercent: 1.5 },
      ],
    });

    expect(opportunity?.cardName).toBe('Card A');
    expect(opportunity?.estimatedAnnualInr).toBeGreaterThan(0);
  });

  it('builds narrative insights including optimization hint', () => {
    const categories = buildCategoryBreakdownFromHistory([
      { amountInr: 1800, categorySlug: 'dining', merchantSlug: 'swiggy', merchantName: 'Swiggy' },
      { amountInr: 8200, categorySlug: 'online', merchantSlug: 'amazon', merchantName: 'Amazon' },
    ]);

    const insights = buildSpendingInsights({
      categories,
      topMerchants: buildTopMerchants([
        {
          amountInr: 8200,
          categorySlug: 'online',
          merchantSlug: 'amazon',
          merchantName: 'Amazon',
        },
      ]),
      inquiryCount: 2,
      totalVolumeInr: 10000,
      dataSource: 'recommendation_history',
      opportunity: {
        cardName: 'Premium Card',
        categoryLabel: 'Online shopping',
        estimatedAnnualInr: 4800,
      },
    });

    expect(insights.some((item) => item.id === 'top-category')).toBe(true);
    expect(insights.some((item) => item.id === 'optimization')).toBe(true);
    expect(insights.some((item) => item.body.includes('4,800'))).toBe(true);
  });
});
