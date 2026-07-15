import { describe, expect, it } from 'vitest';

import { evaluateFlagDefinition, rolloutBucket } from './rollout';

describe('rolloutBucket', () => {
  it('returns stable buckets for the same user and flag', () => {
    expect(rolloutBucket('user-1', 'ai_insights_enabled')).toBe(
      rolloutBucket('user-1', 'ai_insights_enabled'),
    );
  });

  it('returns different buckets for different flags', () => {
    const a = rolloutBucket('user-1', 'ai_insights_enabled');
    const b = rolloutBucket('user-1', 'ai_platform_enabled');
    expect(a).not.toBe(b);
  });
});

describe('evaluateFlagDefinition', () => {
  it('returns false when disabled', () => {
    expect(
      evaluateFlagDefinition({ enabled: false, rolloutPercentage: 100 }, 'user-1', 'onboarding_v1'),
    ).toBe(false);
  });

  it('returns true at 100% rollout when enabled', () => {
    expect(
      evaluateFlagDefinition({ enabled: true, rolloutPercentage: 100 }, 'user-1', 'onboarding_v1'),
    ).toBe(true);
  });

  it('respects percentage rollout', () => {
    const flagKey = 'onboarding_v1';
    const included: string[] = [];
    for (let i = 0; i < 200; i += 1) {
      const userId = `user-${i}`;
      if (evaluateFlagDefinition({ enabled: true, rolloutPercentage: 50 }, userId, flagKey)) {
        included.push(userId);
      }
    }
    expect(included.length).toBeGreaterThan(40);
    expect(included.length).toBeLessThan(160);
  });
});
