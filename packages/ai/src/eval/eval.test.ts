import { describe, expect, it } from 'vitest';

import {
  assertExplanationMentionsCard,
  extractInrAmounts,
  findHallucinatedMultipliers,
  findUngroundedAmounts,
  validateCatalogBundleSafety,
  validateRecoExplanationSafety,
} from './safety';
import { loadCatalogGoldenDataset, runAiEval, runCatalogGoldenEval, runRecoGoldenEval } from './run-eval';

describe('eval safety', () => {
  it('detects ungrounded ₹ amounts with tolerance', () => {
    const audit = JSON.stringify({ expectedRewardInr: 42.5, amountInr: 850 });
    expect(findUngroundedAmounts('Earn ₹42 on this order', audit, 1)).toEqual([]);
    expect(findUngroundedAmounts('Earn ₹999 on this order', audit, 1)).toEqual(['₹999']);
  });

  it('extracts INR values from text', () => {
    const amounts = extractInrAmounts('Reward ₹42.5 and ₹850');
    expect(amounts).toContain(42.5);
    expect(amounts).toContain(850);
  });

  it('flags hallucinated multipliers', () => {
    const issues = findHallucinatedMultipliers('Earn 10x miles on travel', {
      multipliers: [5, 3],
    });
    expect(issues).toContain('10x');
  });

  it('requires card name in explanation', () => {
    expect(assertExplanationMentionsCard('Use HDFC Millennia here', 'HDFC Millennia')).toBe(true);
    expect(assertExplanationMentionsCard('Use another card', 'HDFC Millennia')).toBe(false);
  });

  it('validates reco explanation safety', () => {
    const issues = validateRecoExplanationSafety({
      explanation: {
        explanation: 'HDFC Millennia earns ₹42.5 with 5% cashback.',
        shortSummary: 'Best dining pick',
        bulletReasons: ['5% dining rate'],
      },
      auditJson: JSON.stringify({ expectedRewardInr: 42.5, rewardRatePercent: 5 }),
      recommendedCardName: 'HDFC Millennia',
      allowedPercents: [5],
    });
    expect(issues).toEqual([]);
  });
});

describe('golden datasets', () => {
  it('loads catalog golden dataset with 5+ cards', () => {
    const dataset = loadCatalogGoldenDataset();
    expect(dataset.bankSlug).toBe('idfc-first');
    expect(dataset.cards.length).toBeGreaterThanOrEqual(5);
  });

  it('passes offline catalog eval', () => {
    const result = runCatalogGoldenEval();
    expect(result.passed).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(5);
  });

  it('passes offline dining reco eval (10 scenarios)', () => {
    const result = runRecoGoldenEval('dining');
    expect(result.total).toBe(10);
    expect(result.passed).toBe(true);
  });

  it('passes offline travel reco eval (5 scenarios)', () => {
    const result = runRecoGoldenEval('travel');
    expect(result.total).toBe(5);
    expect(result.passed).toBe(true);
  });

  it('passes full offline AI eval suite', async () => {
    const report = await runAiEval({ live: false });
    expect(report.passed).toBe(true);
    expect(report.suites.length).toBe(3);
  });

  it('validates each catalog golden bundle', () => {
    const dataset = loadCatalogGoldenDataset();
    for (const entry of dataset.cards) {
      expect(validateCatalogBundleSafety(entry.bundle)).toEqual([]);
    }
  });
});
