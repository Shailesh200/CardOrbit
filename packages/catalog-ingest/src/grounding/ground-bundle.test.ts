import { describe, expect, it } from 'vitest';

import { groundIngestBundle } from './ground-bundle';
import type { IngestCardBundle } from '@cardwise/validation';

function baseBundle(overrides: Partial<IngestCardBundle> = {}): IngestCardBundle {
  return {
    bankSlug: 'hdfc',
    bankSourceUrl: 'https://www.hdfc.bank.in/credit-cards',
    name: 'HDFC Millennia',
    slug: 'hdfc-millennia',
    sourceUrl: 'https://www.hdfc.bank.in/credit-cards/millennia',
    networkCode: 'VISA',
    tier: 'ENTRY',
    annualFeeInr: 1000,
    joiningFeeInr: 1000,
    rewardProgramSlug: null,
    pointValueInr: null,
    tags: [],
    structuredFees: [],
    highlights: [
      {
        category: 'REWARDS',
        title: '5x rewards',
        description: 'Earn 5x reward points on online spends',
        sourceUrl: 'https://www.hdfc.bank.in/credit-cards/millennia',
      },
    ],
    approvalSummary: null,
    eligibilitySummary: null,
    benefits: [],
    rewardRules: [
      {
        ruleKey: 'hdfc-millennia-base',
        name: 'Base',
        spendCategoryCode: null,
        merchantSlug: null,
        payload: { rewardMultiplier: 5, exclusions: [] },
        validFrom: '2026-01-01',
        validUntil: null,
        sourceUrl: 'https://www.hdfc.bank.in/credit-cards/millennia',
      },
    ],
    crawlDescription: null,
    feesSummary: null,
    sourceDocuments: [],
    ...overrides,
  };
}

describe('groundIngestBundle', () => {
  it('keeps fees and multipliers present in the source corpus', () => {
    const corpus =
      'Annual fee ₹1,000. Joining fee Rs. 1000. Earn 5x reward points on online spends.';
    const { bundle, grounding } = groundIngestBundle(baseBundle(), corpus);
    expect(bundle.annualFeeInr).toBe(1000);
    expect(bundle.joiningFeeInr).toBe(1000);
    expect(bundle.rewardRules).toHaveLength(1);
    expect(grounding.score).toBeGreaterThanOrEqual(0.9);
    expect(grounding.critical).toBe(false);
  });

  it('strips ungrounded multipliers and flags critical empty-rate copy', () => {
    const corpus = 'Great card with exciting rewards. Annual fee ₹500.';
    const { bundle, grounding } = groundIngestBundle(
      baseBundle({ annualFeeInr: 500, joiningFeeInr: null }),
      corpus,
    );
    expect(bundle.rewardRules).toHaveLength(0);
    expect(grounding.issues.some((issue) => issue.code === 'UNGROUNDED_REWARD_MULTIPLIER')).toBe(
      true,
    );
    expect(grounding.critical).toBe(true);
  });
});
