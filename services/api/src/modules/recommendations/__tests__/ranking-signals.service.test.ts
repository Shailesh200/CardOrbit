import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '@cardwise/feature-flags';

import { AiService } from '../../ai/ai.service';
import { RankingSignalsService } from '../ranking-signals.service';

const generateRankingSignals = vi.fn();

vi.mock('@cardwise/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cardwise/ai')>();
  return {
    ...actual,
    generateRankingSignals: (...args: unknown[]) => generateRankingSignals(...args),
    isAiConfigured: () => true,
  };
});

describe('RankingSignalsService', () => {
  const ai = {
    isFeatureEnabled: vi.fn(),
  } as unknown as AiService;

  const service = new RankingSignalsService(ai);

  const baseInput = {
    userId: 'user-1',
    basePreferences: {
      preferredRewardType: 'cashback' as const,
      boostFavoriteCards: true,
      preferredBankSlugs: ['hdfc'],
    },
    portfolioBankSlugs: ['hdfc', 'icici'],
    favoriteCount: 1,
    portfolioCount: 2,
    profile: {
      preferredRewardType: 'cashback',
      preferredBankSlugs: ['hdfc'],
      preferredCategorySlugs: ['dining'],
      boostFavoriteCards: true,
    },
    request: {
      merchantSlug: 'swiggy',
      categorySlug: 'dining',
      amountInr: 1500,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ai.isFeatureEnabled = vi.fn().mockResolvedValue(true);
  });

  it('returns base preferences when flag is disabled', async () => {
    ai.isFeatureEnabled = vi.fn().mockImplementation(async (flag: string) => {
      if (flag === FeatureFlag.AI_RANKING_SIGNALS_ENABLED) return false;
      return true;
    });

    const result = await service.enrichPreferences(baseInput);
    expect(generateRankingSignals).not.toHaveBeenCalled();
    expect(result.aiPreferenceWeight).toBe(0);
  });

  it('merges AI signals when generation succeeds', async () => {
    generateRankingSignals.mockResolvedValue({
      data: {
        preferredBankSlugs: ['icici'],
        preferenceWeight: 0.15,
      },
    });

    const result = await service.enrichPreferences(baseInput);
    expect(result.preferences.preferredBankSlugs).toEqual(['hdfc', 'icici']);
    expect(result.aiPreferenceWeight).toBe(0.15);
  });

  it('falls back when AI generation fails', async () => {
    generateRankingSignals.mockRejectedValue(new Error('timeout'));

    const result = await service.enrichPreferences(baseInput);
    expect(result.aiPreferenceWeight).toBe(0);
    expect(result.preferences).toEqual(baseInput.basePreferences);
  });
});
