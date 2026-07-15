import { describe, expect, it } from 'vitest';

import { computeOfferSavingsInr, parseOfferMatchQuery } from '../offer-intelligence';

describe('offer-intelligence validation', () => {
  it('parses offer match query with defaults', () => {
    const parsed = parseOfferMatchQuery({});

    expect(parsed.limit).toBe(20);
    expect(parsed.status).toBe('active');
  });

  it('parses merchant slug and amount', () => {
    const parsed = parseOfferMatchQuery({
      merchantSlug: 'amazon',
      amountInr: '2500',
      limit: '5',
    });

    expect(parsed.merchantSlug).toBe('amazon');
    expect(parsed.amountInr).toBe(2500);
    expect(parsed.limit).toBe(5);
  });

  it('computes cashback savings without cap', () => {
    expect(computeOfferSavingsInr(2500, '5', null)).toBe(125);
  });

  it('applies cap when savings exceed it', () => {
    expect(computeOfferSavingsInr(10_000, '10', '500')).toBe(500);
  });

  it('returns null when cashback percent is missing', () => {
    expect(computeOfferSavingsInr(2500, null, '500')).toBeNull();
  });
});
