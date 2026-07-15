import { describe, expect, it } from 'vitest';

import {
  buildMorningSummary,
  buildRecommendedActions,
  mapExpiringRewards,
  mapMilestonePreviews,
  mapTravelPreview,
  resolveHomepageTimeOfDay,
  resolvePersonalizedHomepageWidgets,
} from '../personalized-homepage.builder';

describe('resolveHomepageTimeOfDay', () => {
  it('classifies morning, afternoon, and evening', () => {
    expect(resolveHomepageTimeOfDay(new Date('2026-07-14T08:00:00'))).toBe('morning');
    expect(resolveHomepageTimeOfDay(new Date('2026-07-14T14:00:00'))).toBe('afternoon');
    expect(resolveHomepageTimeOfDay(new Date('2026-07-14T20:00:00'))).toBe('evening');
  });
});

describe('mapExpiringRewards', () => {
  it('sorts by expiry and adds days remaining', () => {
    const mapped = mapExpiringRewards(
      [
        {
          userCardId: 'c2',
          cardName: 'Later',
          kind: 'POINTS',
          expiringAmount: 1000,
          expiringAt: '2026-08-01T00:00:00.000Z',
          estimatedValueInr: 250,
        },
        {
          userCardId: 'c1',
          cardName: 'Soon',
          kind: 'CASHBACK',
          expiringAmount: 500,
          expiringAt: '2026-07-20T00:00:00.000Z',
          estimatedValueInr: 500,
        },
      ],
      new Date('2026-07-14T00:00:00.000Z'),
    );

    expect(mapped[0]?.cardName).toBe('Soon');
    expect(mapped[0]?.daysRemaining).toBe(6);
  });
});

describe('mapMilestonePreviews', () => {
  it('prefers higher progress incomplete milestones', () => {
    const mapped = mapMilestonePreviews([
      {
        id: 'm1',
        userCardId: 'u1',
        creditCardId: 'cc1',
        cardName: 'Atlas',
        bankName: 'Bank',
        ruleId: 'r1',
        ruleName: 'Spend',
        label: 'Quarterly bonus',
        period: 'quarterly',
        periodLabel: 'Q2',
        periodStart: '2026-04-01T00:00:00.000Z',
        periodEnd: '2026-06-30T00:00:00.000Z',
        spendThresholdInr: 100000,
        currentSpendInr: 80000,
        remainingSpendInr: 20000,
        progressPercent: 80,
        milestoneBonus: 2000,
        status: 'IN_PROGRESS',
        transactionCount: 12,
        daysRemaining: 10,
      },
      {
        id: 'm2',
        userCardId: 'u2',
        creditCardId: 'cc2',
        cardName: 'Other',
        bankName: 'Bank',
        ruleId: 'r2',
        ruleName: 'Spend',
        label: 'Done',
        period: 'annual',
        periodLabel: '2026',
        periodStart: '2026-01-01T00:00:00.000Z',
        periodEnd: '2026-12-31T00:00:00.000Z',
        spendThresholdInr: 50000,
        currentSpendInr: 50000,
        remainingSpendInr: 0,
        progressPercent: 100,
        milestoneBonus: 1000,
        status: 'ACHIEVED',
        transactionCount: 20,
        daysRemaining: 100,
      },
    ]);

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.id).toBe('m1');
  });
});

describe('mapTravelPreview', () => {
  it('marks travel context when lounges or miles exist', () => {
    const preview = mapTravelPreview({
      cardCount: 1,
      loungeCardCount: 1,
      totalMiles: 12000,
      totalHotelPoints: 0,
      totalMilesValueInr: 3600,
      travelOfferCount: 2,
      bestTravelCardUserCardId: 'c1',
      cards: [],
      travelOffers: [],
      spending: {
        totalVolumeInr: 40000,
        transactionCount: 3,
        periodLabel: 'Last 90 days',
        topMerchants: [],
      },
    });

    expect(preview?.hasTravelContext).toBe(true);
    expect(preview?.loungeCardCount).toBe(1);
  });
});

describe('buildMorningSummary + buildRecommendedActions', () => {
  const baseInput = {
    greetingName: 'Ada',
    portfolioCount: 2,
    preferredRewardLabel: 'cashback',
    preferredCategorySlug: 'dining',
    offerCount: 2,
    favoriteMerchantCount: 1,
    favoriteCardCount: 1,
    wallet: {
      cardCount: 2,
      totalEstimatedValueInr: 4500,
      expiringSoonCount: 1,
    },
    expiringRewards: [
      {
        userCardId: 'c1',
        cardName: 'Atlas',
        kind: 'POINTS' as const,
        expiringAmount: 2000,
        expiringAt: '2026-07-20T00:00:00.000Z',
        estimatedValueInr: 500,
        daysRemaining: 6,
      },
    ],
    milestones: [
      {
        id: 'm1',
        cardName: 'Atlas',
        label: 'Quarterly bonus',
        progressPercent: 80,
        remainingSpendInr: 20000,
        daysRemaining: 10,
        status: 'IN_PROGRESS' as const,
      },
    ],
    travel: {
      loungeCardCount: 1,
      totalMiles: 12000,
      totalMilesValueInr: 3600,
      travelOfferCount: 1,
      recentTravelSpendInr: 15000,
      periodLabel: 'Last 90 days',
      hasTravelContext: true,
    },
    recentActivityCount: 3,
    now: new Date('2026-07-14T08:30:00'),
  };

  it('builds a morning greeting with highlights', () => {
    const summary = buildMorningSummary(baseInput);
    expect(summary.greeting).toContain('Good morning');
    expect(summary.greeting).toContain('Ada');
    expect(summary.highlights.length).toBeGreaterThan(0);
    expect(summary.headline.toLowerCase()).toContain('reward');
  });

  it('prioritizes expiring-reward and milestone actions', () => {
    const actions = buildRecommendedActions(baseInput);
    expect(actions[0]?.id).toBe('redeem-expiring');
    expect(actions.some((action) => action.id.startsWith('milestone-'))).toBe(true);
    expect(actions.some((action) => action.id === 'travel-hub')).toBe(true);
  });
});

describe('resolvePersonalizedHomepageWidgets', () => {
  it('includes context-aware sections when signals exist', () => {
    const widgets = resolvePersonalizedHomepageWidgets({
      portfolioCount: 2,
      favoriteCardCount: 1,
      offerCount: 1,
      expiringCount: 1,
      milestoneCount: 1,
      hasTravelContext: true,
      recentActivityCount: 2,
      favoriteMerchantCount: 0,
    });

    expect(widgets).toContain('morning-summary');
    expect(widgets).toContain('expiring-rewards');
    expect(widgets).toContain('milestones');
    expect(widgets).toContain('upcoming-travel');
    expect(widgets).toContain('recent-activity');
    expect(widgets).toContain('favorite-cards');
    expect(widgets).toContain('offers');
  });
});
