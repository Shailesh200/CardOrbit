import { describe, expect, it } from 'vitest';

import {
  buildAnnualFeeSummary,
  buildMilestonePreviews,
  groupBenefitSections,
  mapRewardRuleSummary,
} from '../card-benefits.mapper';

describe('card benefits mapper', () => {
  const sampleBenefits = [
    {
      id: 'b1',
      title: 'Domestic lounge visits',
      description: '4 per quarter',
      sourceUrl: null,
      benefitType: { code: 'LOUNGE', name: 'Lounge access' },
    },
    {
      id: 'b2',
      title: 'Travel insurance',
      description: 'Up to ₹50 lakh',
      sourceUrl: null,
      benefitType: { code: 'INSURANCE', name: 'Insurance' },
    },
    {
      id: 'b3',
      title: '5X rewards on dining',
      description: null,
      sourceUrl: null,
      benefitType: { code: 'REWARDS', name: 'Rewards' },
    },
  ];

  it('groups benefits by section code', () => {
    const sections = groupBenefitSections(sampleBenefits, 'https://bank.example/card');
    expect(sections.map((section) => section.code)).toEqual(['LOUNGE', 'INSURANCE', 'REWARDS']);
    expect(sections[0]?.items).toHaveLength(1);
  });

  it('maps reward rule summaries with cap text', () => {
    const summary = mapRewardRuleSummary({
      id: 'rule-v1',
      ruleKey: 'hdfc-regalia-dining',
      name: 'Dining rewards',
      spendCategoryCode: 'DINING',
      payload: {
        rewardMultiplier: 5,
        capPeriod: 'monthly',
        periodCapInr: 2500,
        exclusions: [],
      },
    });

    expect(summary.rewardMultiplier).toBe(5);
    expect(summary.capSummary).toContain('monthly cap');
  });

  it('builds milestone previews from rules', () => {
    const previews = buildMilestonePreviews([
      {
        id: 'r1',
        ruleKey: 'fee-waiver',
        name: 'Annual fee waiver',
        spendCategoryCode: null,
        rewardMultiplier: null,
        cashbackPercent: null,
        milestoneBonus: 10000,
        spendThreshold: 300000,
        capSummary: null,
      },
    ]);

    expect(previews).toHaveLength(1);
    expect(previews[0]?.sourceRuleName).toBe('Annual fee waiver');
  });

  it('builds annual fee summary', () => {
    const summary = buildAnnualFeeSummary({
      annualFeeInr: 2500,
      joiningFeeInr: 2500,
      fees: [{ id: 'f1', feeType: 'ANNUAL', amountInr: 2500, waiverConditions: null }],
      feeBenefits: [],
    });

    expect(summary.annualFeeInr).toBe(2500);
    expect(summary.fees).toHaveLength(1);
  });
});
