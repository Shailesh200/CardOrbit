import { describe, expect, it } from 'vitest';

import {
  enrichLoungeBenefits,
  parseLoungeAllowance,
  summarizeLoungeBenefits,
} from '../travel-hub-lounge';

describe('parseLoungeAllowance', () => {
  it('detects unlimited lounge access', () => {
    const parsed = parseLoungeAllowance('Unlimited domestic lounge access', null);
    expect(parsed.unlimited).toBe(true);
    expect(parsed.allowanceLabel).toContain('Unlimited');
  });

  it('parses visit counts from benefit text', () => {
    const parsed = parseLoungeAllowance('4 complimentary domestic lounge visits per year', null);
    expect(parsed.unlimited).toBe(false);
    expect(parsed.allowanceLabel).toBe('4 visits/year');
  });

  it('parses generic complimentary counts', () => {
    const parsed = parseLoungeAllowance('2 complimentary airport lounge entries', 'Annual benefit');
    expect(parsed.allowanceLabel).toBe('2 complimentary access');
  });
});

describe('enrichLoungeBenefits', () => {
  it('adds allowance metadata to lounge items', () => {
    const items = enrichLoungeBenefits([
      {
        id: '1',
        title: '8 domestic lounge visits annually',
        description: null,
        sectionCode: 'LOUNGE',
        sectionLabel: 'Lounge access',
        sourceUrl: null,
      },
    ]);

    expect(items[0]?.allowanceLabel).toBe('8 visits/year');
    expect(summarizeLoungeBenefits(items)).toBe('8 visits/year');
  });
});
