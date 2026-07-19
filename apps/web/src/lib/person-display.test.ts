import { describe, expect, it } from 'vitest';

import { buildPostHogPersonProperties, resolvePersonDisplayName } from './person-display';

describe('resolvePersonDisplayName', () => {
  it('prefers fullName', () => {
    expect(
      resolvePersonDisplayName({
        fullName: 'Priya Sharma',
        firstName: 'Priya',
        email: 'priya@example.com',
      }),
    ).toBe('Priya Sharma');
  });

  it('falls back to first + last', () => {
    expect(
      resolvePersonDisplayName({
        fullName: null,
        firstName: 'Alex',
        lastName: 'Kumar',
        email: 'alex@example.com',
      }),
    ).toBe('Alex Kumar');
  });

  it('falls back to email', () => {
    expect(
      resolvePersonDisplayName({
        fullName: null,
        firstName: null,
        lastName: null,
        email: 'solo@example.com',
      }),
    ).toBe('solo@example.com');
  });
});

describe('buildPostHogPersonProperties', () => {
  it('sets email and name fields PostHog uses for display', () => {
    expect(
      buildPostHogPersonProperties({
        email: 'priya@example.com',
        fullName: 'Priya Sharma',
        firstName: 'Priya',
        lastName: 'Sharma',
      }),
    ).toEqual({
      email: 'priya@example.com',
      name: 'Priya Sharma',
      $name: 'Priya Sharma',
      first_name: 'Priya',
      last_name: 'Sharma',
    });
  });
});
