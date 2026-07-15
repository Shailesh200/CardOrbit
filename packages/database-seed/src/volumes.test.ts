import { describe, expect, it } from 'vitest';

import { loadAllSeedFiles } from './load';

describe('database-seed catalog (M-010)', () => {
  it('loads valid reference catalogs without duplicate slugs', () => {
    const seed = loadAllSeedFiles();

    expect(seed.banks.banks.length).toBeGreaterThanOrEqual(10);

    const bankSlugs = seed.banks.banks.map((b) => b.slug);
    expect(new Set(bankSlugs).size).toBe(bankSlugs.length);

    const merchantSlugs = seed.merchants.merchants.map((m) => m.slug);
    expect(new Set(merchantSlugs).size).toBe(merchantSlugs.length);
    expect(seed.merchants.merchants.length).toBeGreaterThanOrEqual(500);
    expect((seed.merchants.mccMappings ?? []).length).toBeGreaterThanOrEqual(10);

    const cardSlugs = seed.cards.cards.map((c) => c.slug);
    expect(new Set(cardSlugs).size).toBe(cardSlugs.length);
  });
});
