import { describe, expect, it } from 'vitest';

import { needsOnboardingGate } from './onboarding-gate';
import { postAuthPath } from './onboarding-api';

describe('onboarding gate', () => {
  it('redirects incomplete users', () => {
    expect(
      needsOnboardingGate({
        isComplete: false,
        status: 'IN_PROGRESS',
        flagEnabled: true,
      }),
    ).toBe(true);
    expect(postAuthPath({ isComplete: false })).toBe('/onboarding');
  });

  it('allows completed or skipped users', () => {
    expect(
      needsOnboardingGate({
        isComplete: true,
        status: 'COMPLETED',
        flagEnabled: true,
      }),
    ).toBe(false);
    expect(postAuthPath({ isComplete: true })).toBe('/account');
  });

  it('bypasses when flag disabled', () => {
    expect(
      needsOnboardingGate(
        {
          isComplete: false,
          status: 'NOT_STARTED',
          flagEnabled: false,
        },
        false,
      ),
    ).toBe(false);
  });
});
