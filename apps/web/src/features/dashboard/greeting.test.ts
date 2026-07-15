import { describe, expect, it } from 'vitest';

import { greetingName } from './greeting';

describe('greetingName', () => {
  it('prefers first name', () => {
    expect(greetingName({ firstName: 'Priya', fullName: 'Priya Sharma' })).toBe('Priya');
  });

  it('falls back to first token of full name', () => {
    expect(greetingName({ firstName: null, fullName: 'Alex Kumar' })).toBe('Alex');
  });

  it('uses generic greeting when profile is empty', () => {
    expect(greetingName(null)).toBe('there');
  });
});
