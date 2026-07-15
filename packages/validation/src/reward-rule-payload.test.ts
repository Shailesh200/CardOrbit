import { describe, expect, it } from 'vitest';

import { parseRewardRulePayload, safeParseRewardRulePayload } from './reward-rule-payload';

describe('RewardRulePayloadSchema', () => {
  it('accepts a bootstrap-style multiplier rule', () => {
    const payload = parseRewardRulePayload({
      rewardMultiplier: 5,
      cap: 15000,
      exclusions: ['fuel'],
    });
    expect(payload.rewardMultiplier).toBe(5);
    expect(payload.exclusions).toEqual(['fuel']);
  });

  it('rejects payloads with no reward economics', () => {
    const result = safeParseRewardRulePayload({
      cap: 1000,
      exclusions: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative multipliers', () => {
    const result = safeParseRewardRulePayload({
      rewardMultiplier: -1,
    });
    expect(result.success).toBe(false);
  });
});
