import { describe, expect, it, vi } from 'vitest';

import type { RankedCardRecommendation, RecommendationAuditEntry } from './recommendation-ranker';
import {
  buildCalculationBreakdown,
  buildRecommendationCitations,
  enrichRecommendationExplanation,
} from './recommendation-explanation';

vi.mock('@cardwise/ai', () => ({
  isAiConfigured: vi.fn(() => true),
  explainRecommendation: vi.fn(),
  findUngroundedAmounts: vi.fn(() => []),
}));

vi.mock('@cardwise/feature-flags', () => ({
  FeatureFlag: {
    AI_PLATFORM_ENABLED: 'ai_platform_enabled',
    AI_EXPLANATIONS_ENABLED: 'ai_explanations_enabled',
  },
  initFeatureFlags: vi.fn(),
  isEnabled: vi.fn(
    async (flag: string) => flag === 'ai_platform_enabled' || flag === 'ai_explanations_enabled',
  ),
}));

const baseCard: RankedCardRecommendation = {
  userCardId: 'uc-1',
  creditCardId: 'cc-1',
  cardName: 'HDFC Millennia',
  bankName: 'HDFC Bank',
  bankSlug: 'hdfc',
  cardSlug: 'hdfc-millennia',
  rank: 1,
  score: 100,
  expectedRewardInr: 42.5,
  effectiveRatePercent: 5,
  explanation: '5% cashback on dining',
  ruleKey: 'hdfc-millennia-dining',
  ruleName: 'Dining cashback',
  excluded: false,
  benefitsApplied: ['5% on dining'],
  confidenceScore: 0.9,
  campaignApplied: false,
  milestoneCrossed: false,
  compositeScoreInr: 42.5,
  scoreBreakdown: null,
  strategicRationale: null,
};

const audit: RecommendationAuditEntry[] = [{ ...baseCard, eligible: true }];

describe('recommendation-explanation', () => {
  it('builds citations from rule and benefits', () => {
    const citations = buildRecommendationCitations(baseCard);
    expect(citations.some((row) => row.type === 'rule' && row.id === 'hdfc-millennia-dining')).toBe(
      true,
    );
    expect(citations.some((row) => row.type === 'benefit')).toBe(true);
  });

  it('returns template explanation when AI is disabled', async () => {
    const envelope = await enrichRecommendationExplanation({
      ranked: [baseCard],
      audit,
      amountInr: 850,
      merchantName: 'Swiggy',
      rankingVersion: 'v1',
      aiEnabled: false,
    });

    expect(envelope?.explanationSource).toBe('template');
    expect(envelope?.calculationBreakdown).toEqual(buildCalculationBreakdown(baseCard, 850, 'v1'));
  });

  it('uses AI explanation when grounded', async () => {
    const { explainRecommendation } = await import('@cardwise/ai');
    vi.mocked(explainRecommendation).mockResolvedValue({
      data: {
        explanation: 'Use HDFC Millennia for ₹42.5 on this Swiggy order.',
        shortSummary: 'Best dining cashback',
        bulletReasons: ['5% on dining'],
      },
      model: 'test-model',
      latencyMs: 120,
    });

    const envelope = await enrichRecommendationExplanation({
      ranked: [baseCard],
      audit,
      amountInr: 850,
      merchantName: 'Swiggy',
      rankingVersion: 'v1',
      aiEnabled: true,
    });

    expect(envelope?.explanationSource).toBe('ai');
    expect(envelope?.shortSummary).toBe('Best dining cashback');
    expect(envelope?.aiModel).toBe('test-model');
  });

  it('falls back to template when AI mentions ungrounded amounts', async () => {
    const { explainRecommendation, findUngroundedAmounts: findUngrounded } =
      await import('@cardwise/ai');
    vi.mocked(explainRecommendation).mockResolvedValue({
      data: {
        explanation: 'Earn ₹9999 on this order.',
        shortSummary: 'Too high',
        bulletReasons: ['Hallucinated'],
      },
      model: 'test-model',
      latencyMs: 120,
    });
    vi.mocked(findUngrounded).mockReturnValue(['₹9999']);

    const envelope = await enrichRecommendationExplanation({
      ranked: [baseCard],
      audit,
      amountInr: 850,
      rankingVersion: 'v1',
      aiEnabled: true,
    });

    expect(envelope?.explanationSource).toBe('template');
    expect(envelope?.aiModel).toBe('test-model');
  });

  it('falls back to template when AI explanation exceeds budget', async () => {
    const { explainRecommendation } = await import('@cardwise/ai');
    vi.mocked(explainRecommendation).mockImplementation(
      () => new Promise(() => undefined) as Promise<never>,
    );

    const started = Date.now();
    const envelope = await enrichRecommendationExplanation({
      ranked: [baseCard],
      audit,
      amountInr: 850,
      merchantName: 'Swiggy',
      rankingVersion: 'v1',
      aiEnabled: true,
    });
    const elapsed = Date.now() - started;

    expect(envelope?.explanationSource).toBe('template');
    expect(elapsed).toBeLessThan(5_000);
  });
});
