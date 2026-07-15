import { describe, expect, it } from 'vitest';

import {
  buildCardSearchDocument,
  buildMerchantSearchDocument,
  catalogSearchTerms,
  cosineSimilarity,
  hashSearchDocument,
} from '../semantic-search';

describe('semantic-search helpers', () => {
  it('builds card documents with bank and benefits', () => {
    const text = buildCardSearchDocument({
      name: 'Millennia',
      slug: 'hdfc-millennia',
      bankName: 'HDFC Bank',
      networkName: 'Visa',
      tier: 'STANDARD',
      annualFeeInr: '1000',
      benefits: [{ title: '5% cashback', description: 'On partner merchants' }],
    });

    expect(text).toContain('HDFC Bank');
    expect(text).toContain('5% cashback');
  });

  it('builds merchant documents with category and aliases', () => {
    const text = buildMerchantSearchDocument({
      name: 'Swiggy',
      slug: 'swiggy',
      categoryName: 'Food Delivery',
      tags: ['food', 'delivery'],
      aliases: ['swiggy food'],
    });

    expect(text).toContain('Food Delivery');
    expect(text).toContain('swiggy food');
  });

  it('hashes documents deterministically', () => {
    const hashA = hashSearchDocument('same text');
    const hashB = hashSearchDocument('same text');
    const hashC = hashSearchDocument('other text');

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it('computes cosine similarity', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('extracts catalog search terms from natural language queries', () => {
    expect(catalogSearchTerms('0% forex card')).toEqual(['0%', 'forex']);
    expect(catalogSearchTerms('HDFC Millennia')).toEqual(['hdfc', 'millennia']);
  });
});
