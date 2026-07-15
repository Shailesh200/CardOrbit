import { describe, expect, it } from 'vitest';

import type { ActiveRewardRuleView } from '../domain/entities/reward-rule';
import { filterApplicableRules } from '../domain/services/rule-matcher';

const at = new Date('2026-06-01T12:00:00.000Z');

function rule(
  overrides: Partial<ActiveRewardRuleView['activeVersion']> & {
    ruleKey?: string;
    creditCardId?: string;
  },
): ActiveRewardRuleView {
  return {
    rule: {
      id: 'rule-1',
      ruleKey: overrides.ruleKey ?? 'test_rule',
      name: 'Test Rule',
      creditCardId: overrides.creditCardId ?? 'card-1',
      rewardProgramId: null,
      version: 1,
      deletedAt: null,
    },
    activeVersion: {
      id: 'version-1',
      ruleId: 'rule-1',
      versionNumber: 1,
      status: 'ACTIVE',
      spendCategoryId: overrides.spendCategoryId ?? null,
      merchantId: overrides.merchantId ?? null,
      payload: { rewardMultiplier: 2, exclusions: [] },
      validFrom: overrides.validFrom ?? null,
      validUntil: overrides.validUntil ?? null,
      activatedAt: at,
      deactivatedAt: null,
      version: 1,
      deletedAt: null,
    },
    pointValueInr: 0.25,
    spendCategoryCode: null,
  };
}

describe('filterApplicableRules', () => {
  it('returns catch-all rules when no category or merchant set', () => {
    const rules = [rule({})];
    const result = filterApplicableRules(rules, { at, spendCategoryId: 'cat-1' });
    expect(result).toHaveLength(1);
  });

  it('matches merchant-specific rule', () => {
    const rules = [
      rule({ merchantId: 'merchant-a' }),
      rule({ ruleKey: 'generic', spendCategoryId: null, merchantId: null }),
    ];
    const result = filterApplicableRules(rules, {
      at,
      merchantId: 'merchant-a',
      spendCategoryId: 'cat-1',
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.rule.ruleKey).toBe('test_rule');
  });

  it('matches category-specific rule', () => {
    const rules = [
      rule({ spendCategoryId: 'cat-travel' }),
      rule({ ruleKey: 'generic', spendCategoryId: null, merchantId: null }),
    ];
    const result = filterApplicableRules(rules, {
      at,
      spendCategoryId: 'cat-travel',
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.activeVersion.spendCategoryId).toBe('cat-travel');
  });

  it('excludes merchant rule when merchant mismatches', () => {
    const rules = [rule({ merchantId: 'merchant-a' })];
    const result = filterApplicableRules(rules, {
      at,
      merchantId: 'merchant-b',
    });
    expect(result).toHaveLength(0);
  });

  it('excludes category rule when category mismatches', () => {
    const rules = [rule({ spendCategoryId: 'cat-travel' })];
    const result = filterApplicableRules(rules, {
      at,
      spendCategoryId: 'cat-dining',
    });
    expect(result).toHaveLength(0);
  });

  it('filters by validFrom', () => {
    const rules = [rule({ validFrom: new Date('2026-07-01T00:00:00.000Z') })];
    const result = filterApplicableRules(rules, { at, spendCategoryId: null });
    expect(result).toHaveLength(0);
  });

  it('filters by validUntil', () => {
    const rules = [rule({ validUntil: new Date('2026-05-01T00:00:00.000Z') })];
    const result = filterApplicableRules(rules, { at, spendCategoryId: null });
    expect(result).toHaveLength(0);
  });

  it('returns multiple rules at same scope level', () => {
    const rules = [
      rule({ ruleKey: 'rule-a', spendCategoryId: 'cat-1' }),
      rule({ ruleKey: 'rule-b', spendCategoryId: 'cat-1' }),
    ];
    const result = filterApplicableRules(rules, {
      at,
      spendCategoryId: 'cat-1',
    });
    expect(result).toHaveLength(2);
  });
});
