import { describe, expect, it } from 'vitest';

import { displayCategoryLabel, displayMerchantName, looksLikeOpaqueId } from './display-names';

describe('display names', () => {
  it('prefers merchant name and never returns slug or uuid', () => {
    expect(displayMerchantName({ name: 'Swiggy', slug: 'swiggy' })).toBe('Swiggy');
    expect(displayMerchantName({ name: null, slug: 'swiggy' })).toBe('Merchant');
    expect(
      displayMerchantName({
        name: '019f52a4-c692-727d-b386-e925a3c8ae03',
        slug: 'swiggy',
        fallback: 'Merchant',
      }),
    ).toBe('Merchant');
  });

  it('maps category slugs to labels', () => {
    expect(displayCategoryLabel('dining')).toBe('Dining');
    expect(displayCategoryLabel('online')).toBe('Online shopping');
    expect(displayCategoryLabel('custom_slug')).toBe('Custom Slug');
  });

  it('detects opaque ids', () => {
    expect(looksLikeOpaqueId('019f52a4-c692-727d-b386-e925a3c8ae03')).toBe(true);
    expect(looksLikeOpaqueId('Swiggy')).toBe(false);
  });
});
