import { describe, expect, it } from 'vitest';

import {
  CreateSavedSearchSchema,
  parseAddFavoriteMerchantInput,
  parseCreateSavedSearchInput,
} from '../merchant-preferences';

describe('merchant-preferences validation', () => {
  it('parses saved search create input', () => {
    const parsed = parseCreateSavedSearchInput({
      name: 'Food delivery',
      query: 'swiggy',
      categorySlug: 'dining',
    });

    expect(parsed.name).toBe('Food delivery');
    expect(parsed.query).toBe('swiggy');
  });

  it('requires merchantId or slug for favorites', () => {
    expect(() => parseAddFavoriteMerchantInput({})).toThrow();
    expect(parseAddFavoriteMerchantInput({ slug: 'amazon' }).slug).toBe('amazon');
  });

  it('rejects empty saved search names', () => {
    expect(() =>
      CreateSavedSearchSchema.parse({
        name: '   ',
        query: 'swiggy',
      }),
    ).toThrow();
  });
});
