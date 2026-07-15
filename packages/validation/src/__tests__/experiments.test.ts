import { describe, expect, it } from 'vitest';

import { DEFAULT_EXPERIMENT_DEFINITIONS, parseUpdateExperimentInput } from '../experiments';

describe('experiments validation', () => {
  it('defines default experiment seeds', () => {
    expect(DEFAULT_EXPERIMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_EXPERIMENT_DEFINITIONS[0]?.variants.length).toBeGreaterThanOrEqual(2);
  });

  it('parses experiment update input', () => {
    const parsed = parseUpdateExperimentInput({
      enabled: true,
      rolloutPercentage: 25,
      description: 'Test rollout',
    });
    expect(parsed).toEqual({
      enabled: true,
      rolloutPercentage: 25,
      description: 'Test rollout',
    });
  });
});
