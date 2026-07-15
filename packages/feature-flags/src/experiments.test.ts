import { describe, expect, it } from 'vitest';

import { assignExperimentVariant } from './experiments';

describe('assignExperimentVariant', () => {
  const base = {
    key: 'reco_ranking_v2',
    variants: ['control', 'ranking_signals'],
    defaultVariant: 'control',
    enabled: true,
    rolloutPercentage: 100,
  };

  it('returns default when experiment is disabled', () => {
    expect(
      assignExperimentVariant({ ...base, enabled: false, rolloutPercentage: 100 }, 'user-1'),
    ).toBe('control');
  });

  it('returns default when rollout is zero', () => {
    expect(
      assignExperimentVariant({ ...base, enabled: true, rolloutPercentage: 0 }, 'user-1'),
    ).toBe('control');
  });

  it('assigns a stable variant for the same user', () => {
    const first = assignExperimentVariant(base, 'user-stable');
    const second = assignExperimentVariant(base, 'user-stable');
    expect(first).toBe(second);
    expect(['control', 'ranking_signals']).toContain(first);
  });

  it('keeps user on default when outside rollout bucket', () => {
    const definition = { ...base, rolloutPercentage: 1 };
    let defaultCount = 0;
    for (let index = 0; index < 200; index += 1) {
      const variant = assignExperimentVariant(definition, `user-${index}`);
      if (variant === 'control') defaultCount += 1;
    }
    expect(defaultCount).toBeGreaterThan(100);
  });
});
