import { describe, expect, it } from 'vitest';

import { mergeAiRewardRules } from './catalog-ai-ingest.runner';
import type { IngestCardBundle } from '@cardwise/validation';

function rule(ruleKey: string): IngestCardBundle['rewardRules'][number] {
  return {
    ruleKey,
    name: 'Base rewards',
    spendCategoryCode: null,
    merchantSlug: null,
    payload: { rewardMultiplier: 5, exclusions: [] },
    validFrom: '2026-01-01',
    validUntil: null,
    sourceUrl: 'https://example.com/card',
  };
}

describe('mergeAiRewardRules', () => {
  it('keeps AI rewardRules when the AI draft already found some', () => {
    const aiRules = [rule('card-ai-rule')];
    const fallbackRules = [rule('card-fallback-rule')];

    expect(mergeAiRewardRules(aiRules, fallbackRules)).toBe(aiRules);
  });

  it('falls back to the rule-based parser rewardRules when AI returned none', () => {
    const fallbackRules = [rule('card-fallback-rule')];

    expect(mergeAiRewardRules([], fallbackRules)).toEqual(fallbackRules);
  });

  it('returns an empty array when neither AI nor fallback found a rewardRule', () => {
    expect(mergeAiRewardRules([], undefined)).toEqual([]);
    expect(mergeAiRewardRules([], [])).toEqual([]);
  });
});
