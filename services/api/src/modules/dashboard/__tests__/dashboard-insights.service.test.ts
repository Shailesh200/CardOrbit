import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '@cardwise/feature-flags';

import { AiService } from '../../ai/ai.service';
import { DashboardInsightsService } from '../dashboard-insights.service';

const generateSmartInsights = vi.fn();
const isAiConfigured = vi.fn();

vi.mock('@cardwise/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cardwise/ai')>();
  return {
    ...actual,
    generateSmartInsights: (...args: unknown[]) => generateSmartInsights(...args),
    isAiConfigured: () => isAiConfigured(),
  };
});

const baseInput = {
  userId: 'user-1',
  preferredRewardType: 'cashback',
  preferredCategorySlugs: ['dining'],
  categories: ['dining'],
  boostFavoriteCards: true,
  recommendationScenario: {
    merchantSlug: 'swiggy',
    merchantName: 'Swiggy',
    categorySlug: 'dining',
    amount: 1500,
  },
  cardCount: 2,
  favoriteCount: 0,
};

describe('DashboardInsightsService', () => {
  const ai = {
    isFeatureEnabled: vi.fn(),
  } as unknown as AiService;

  const service = new DashboardInsightsService(ai);

  beforeEach(() => {
    vi.clearAllMocks();
    isAiConfigured.mockReturnValue(true);
    ai.isFeatureEnabled = vi.fn().mockResolvedValue(true);
  });

  it('builds template insights with source template', () => {
    const insights = service.buildTemplateInsights(baseInput);

    expect(insights.length).toBeGreaterThan(0);
    expect(insights.every((row) => row.source === 'template')).toBe(true);
    expect(insights.some((row) => row.id === 'reward-type')).toBe(true);
    expect(insights.some((row) => row.id === 'pin-favorites')).toBe(true);
    const topCategory = insights.find((row) => row.id === 'top-category');
    expect(topCategory?.title).toBe('Optimized for Dining');
    expect(topCategory?.body).toContain('Swiggy');
    expect(topCategory?.body).not.toContain('swiggy');
  });

  it('returns template insights when AI insights flag is disabled', async () => {
    ai.isFeatureEnabled = vi.fn().mockImplementation(async (flag: string) => {
      if (flag === FeatureFlag.AI_INSIGHTS_ENABLED) return false;
      return true;
    });

    const insights = await service.resolveInsights(baseInput);

    expect(generateSmartInsights).not.toHaveBeenCalled();
    expect(insights.every((row) => row.source === 'template')).toBe(true);
  });

  it('returns AI insights when enabled and generation succeeds', async () => {
    generateSmartInsights.mockResolvedValue({
      data: {
        insights: [
          {
            id: 'dining-focus',
            title: 'Dining rewards tuned',
            body: 'Your cashback preference fits Swiggy-style dining spends.',
            actionLabel: 'Compare at merchant',
            actionPath: '/account/merchants/swiggy',
          },
        ],
      },
    });

    const insights = await service.resolveInsights(baseInput);

    expect(generateSmartInsights).toHaveBeenCalledOnce();
    expect(insights).toHaveLength(1);
    expect(insights[0]?.source).toBe('ai');
    expect(insights[0]?.title).toBe('Dining rewards tuned');
  });

  it('falls back to template insights when AI generation fails', async () => {
    generateSmartInsights.mockRejectedValue(new Error('provider timeout'));

    const insights = await service.resolveInsights(baseInput);

    expect(insights.every((row) => row.source === 'template')).toBe(true);
    expect(insights.some((row) => row.id === 'reward-type')).toBe(true);
  });
});
