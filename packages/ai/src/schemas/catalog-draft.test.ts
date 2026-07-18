import { describe, expect, it } from 'vitest';

import { draftToIngestBundle, type CatalogAiDraft } from './catalog-draft';

const BASE_DRAFT: CatalogAiDraft = {
  name: 'FIRST Classic Credit Card',
  slug: 'idfc-first-classic',
  networkCode: 'VISA',
  tier: 'STANDARD',
  tags: ['Cashback'],
  highlights: [],
  structuredFees: [],
  rewardRules: [],
  annualFeeInr: 499,
  joiningFeeInr: 0,
  approvalSummary: null,
  eligibilitySummary: null,
};

const INPUT = { bankSlug: 'idfc-first', sourceUrl: 'https://www.idfcfirst.bank.in/credit-card/classic-credit-card' };

describe('draftToIngestBundle rewardRules', () => {
  it('maps explicit draft rewardRules into IngestRewardRule payloads', () => {
    const draft: CatalogAiDraft = {
      ...BASE_DRAFT,
      rewardRules: [
        {
          ruleKey: 'base-rewards',
          name: '5X reward points on travel',
          spendCategoryCode: 'TRAVEL',
          rewardMultiplier: 5,
          cashbackPercent: null,
          perTransactionCap: null,
          monthlyLimit: null,
        },
      ],
    };

    const bundle = draftToIngestBundle(draft, INPUT);

    expect(bundle.rewardRules).toHaveLength(1);
    expect(bundle.rewardRules[0]?.ruleKey).toBe('idfc-first-classic-base-rewards');
    expect(bundle.rewardRules[0]?.payload).toMatchObject({ rewardMultiplier: 5 });
  });

  it('drops draft rewardRules that have neither a multiplier nor a cashback rate', () => {
    const draft: CatalogAiDraft = {
      ...BASE_DRAFT,
      rewardRules: [
        {
          ruleKey: 'vague-rule',
          name: 'Great rewards',
          spendCategoryCode: null,
          rewardMultiplier: null,
          cashbackPercent: null,
          perTransactionCap: null,
          monthlyLimit: null,
        },
      ],
    };

    expect(draftToIngestBundle(draft, INPUT).rewardRules).toEqual([]);
  });

  it('derives a rewardRule from a cashback highlight when the draft omitted rewardRules', () => {
    const draft: CatalogAiDraft = {
      ...BASE_DRAFT,
      highlights: [
        {
          category: 'CASHBACK',
          title: 'Up to 1% cashback',
          description: 'On eligible spends',
        },
      ],
    };

    const bundle = draftToIngestBundle(draft, INPUT);

    expect(bundle.rewardRules).toHaveLength(1);
    expect(bundle.rewardRules[0]?.payload).toMatchObject({ cashbackPercent: 1 });
  });

  it('derives a rewardRule from a "5X" style rewards highlight', () => {
    const draft: CatalogAiDraft = {
      ...BASE_DRAFT,
      highlights: [
        {
          category: 'REWARDS',
          title: '5X reward points on dining',
          description: null,
        },
      ],
    };

    const bundle = draftToIngestBundle(draft, INPUT);

    expect(bundle.rewardRules).toHaveLength(1);
    expect(bundle.rewardRules[0]?.payload).toMatchObject({ rewardMultiplier: 5 });
  });

  it('leaves rewardRules empty when no explicit numeric rate is present anywhere', () => {
    const draft: CatalogAiDraft = {
      ...BASE_DRAFT,
      highlights: [
        {
          category: 'REWARDS',
          title: 'Great rewards on every spend',
          description: 'Earn generous rewards',
        },
      ],
    };

    expect(draftToIngestBundle(draft, INPUT).rewardRules).toEqual([]);
  });
});
