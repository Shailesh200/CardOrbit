import { describe, expect, it } from 'vitest';

import { parseInrAmount } from './checkout-context';

describe('checkout-context (M-032)', () => {
  it('parses INR amounts from currency strings', () => {
    expect(parseInrAmount('₹2,499')).toBe(2499);
    expect(parseInrAmount('Rs. 850')).toBe(850);
  });

  it('rejects unrealistic values', () => {
    expect(parseInrAmount('₹10')).toBeNull();
    expect(parseInrAmount('not-a-number')).toBeNull();
  });
});
