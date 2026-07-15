import { describe, expect, it } from 'vitest';

import {
  isExcluded,
  mergeExclusionTags,
  tagsForSpendCategory,
} from '../domain/services/exclusion-tags';

describe('tagsForSpendCategory', () => {
  it('maps FUEL code to fuel tag', () => {
    expect(tagsForSpendCategory('FUEL', 'fuel')).toContain('fuel');
  });

  it('includes slug and lowercase code', () => {
    const tags = tagsForSpendCategory('DINING', 'dining');
    expect(tags).toContain('dining');
  });

  it('returns empty for missing code', () => {
    expect(tagsForSpendCategory(null)).toEqual([]);
  });
});

describe('mergeExclusionTags', () => {
  it('deduplicates tags case-insensitively', () => {
    expect(mergeExclusionTags(['Fuel'], ['fuel', 'rent'])).toEqual(['fuel', 'rent']);
  });
});

describe('isExcluded', () => {
  it('detects matching exclusion', () => {
    expect(isExcluded(['fuel'], ['fuel', 'rent']).excluded).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isExcluded(['FUEL'], ['fuel']).excluded).toBe(true);
  });

  it('returns false when no match', () => {
    expect(isExcluded(['shopping'], ['fuel']).excluded).toBe(false);
  });
});
