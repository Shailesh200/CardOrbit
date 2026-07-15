import { describe, expect, it } from 'vitest';

import {
  mergeDashboardPreferences,
  parseDashboardPreferences,
  resolveVisibleDashboardWidgets,
} from '@cardwise/validation';

import { DashboardInsightsService } from '../dashboard-insights.service';

describe('dashboard preferences', () => {
  it('parses defaults for empty input', () => {
    const prefs = parseDashboardPreferences(null);
    expect(prefs.hiddenWidgets).toEqual([]);
    expect(prefs.widgetOrder.length).toBeGreaterThan(0);
  });

  it('hides widgets and preserves order', () => {
    const visible = resolveVisibleDashboardWidgets(
      parseDashboardPreferences({ hiddenWidgets: ['savings'] }),
      ['insights', 'recommendation', 'savings', 'portfolio'],
    );
    expect(visible).toEqual(['insights', 'recommendation', 'portfolio']);
  });

  it('drops unknown widget ids from stored preferences', () => {
    const prefs = parseDashboardPreferences({
      widgetOrder: ['morning-summary', 'legacy-widget', 'recommendation'],
      hiddenWidgets: ['not-a-widget'],
    });
    expect(prefs.widgetOrder).toEqual(['morning-summary', 'recommendation']);
    expect(prefs.hiddenWidgets).toEqual([]);
  });

  it('merges preference updates', () => {
    const merged = mergeDashboardPreferences({}, { hiddenWidgets: ['offers'] });
    expect(merged.hiddenWidgets).toEqual(['offers']);
    expect(merged.updatedAt).toBeDefined();
  });
});

describe('DashboardInsightsService templates', () => {
  const service = new DashboardInsightsService({} as never);

  it('builds insights from personalization shape', () => {
    const insights = service.buildTemplateInsights({
      userId: 'user-1',
      preferredRewardType: 'cashback',
      preferredCategorySlugs: ['dining'],
      boostFavoriteCards: true,
      categories: ['dining'],
      recommendationScenario: { merchantSlug: 'swiggy', categorySlug: 'dining', amount: 1500 },
      cardCount: 2,
      favoriteCount: 0,
    });

    expect(insights.some((row) => row.id === 'reward-type')).toBe(true);
    expect(insights.some((row) => row.id === 'pin-favorites')).toBe(true);
  });
});
