import { describe, expect, it } from 'vitest';

import {
  buildPremiumCardRoi,
  buildPremiumDashboardOverview,
  buildPremiumRecommendations,
  estimateBenefitsValueInr,
  isPremiumCard,
} from '../premium-dashboard-engine';

describe('isPremiumCard', () => {
  it('detects premium tier cards', () => {
    expect(isPremiumCard('PREMIUM', 0)).toBe(true);
    expect(isPremiumCard('STANDARD', 10_000)).toBe(true);
    expect(isPremiumCard('STANDARD', 999)).toBe(false);
  });
});

describe('estimateBenefitsValueInr', () => {
  it('sums lifestyle benefit estimates', () => {
    const value = estimateBenefitsValueInr({
      lounge: 1,
      insurance: 1,
      travel: 0,
      fuel: 1,
      dining: 0,
      emi: 0,
    });
    expect(value).toBe(8_000 + 3_000 + 1_500);
  });
});

describe('buildPremiumCardRoi', () => {
  it('computes net ROI after annual fee', () => {
    const roi = buildPremiumCardRoi({
      userCardId: 'uc1',
      creditCardId: 'cc1',
      cardName: 'Premium Card',
      bankName: 'Test Bank',
      tier: 'PREMIUM',
      annualFeeInr: 10_000,
      walletValueInr: 5_000,
      spendVolumeInr: 200_000,
      benefitCounts: { lounge: 1, insurance: 1, travel: 0, fuel: 0, dining: 0, emi: 0 },
      milestoneBonusPotentialInr: 2_000,
      feeWaiverProgressPercent: 80,
    });

    expect(roi.annualSavingsInr).toBeGreaterThan(0);
    expect(roi.netRoiInr).toBe(roi.annualSavingsInr - 10_000);
    expect(roi.rewardEfficiencyPercent).toBeCloseTo(2.5, 1);
  });
});

describe('buildPremiumRecommendations', () => {
  it('surfaces fee waiver and negative ROI cards', () => {
    const cards = [
      buildPremiumCardRoi({
        userCardId: 'a',
        creditCardId: 'c1',
        cardName: 'Good Card',
        bankName: 'Bank',
        tier: 'PREMIUM',
        annualFeeInr: 5_000,
        walletValueInr: 20_000,
        spendVolumeInr: 100_000,
        benefitCounts: { lounge: 1, insurance: 1, travel: 0, fuel: 0, dining: 0, emi: 0 },
        milestoneBonusPotentialInr: 0,
        feeWaiverProgressPercent: null,
      }),
      buildPremiumCardRoi({
        userCardId: 'b',
        creditCardId: 'c2',
        cardName: 'Weak Card',
        bankName: 'Bank',
        tier: 'PREMIUM',
        annualFeeInr: 15_000,
        walletValueInr: 500,
        spendVolumeInr: 5_000,
        benefitCounts: { lounge: 0, insurance: 0, travel: 0, fuel: 0, dining: 0, emi: 0 },
        milestoneBonusPotentialInr: 0,
        feeWaiverProgressPercent: 75,
      }),
    ];

    const recommendations = buildPremiumRecommendations(cards);
    expect(recommendations.some((row) => row.kind === 'ROI')).toBe(true);
    expect(recommendations.some((row) => row.kind === 'USAGE')).toBe(true);
    expect(recommendations.some((row) => row.kind === 'FEE_WAIVER')).toBe(true);
  });
});

describe('buildPremiumDashboardOverview', () => {
  it('aggregates portfolio premium metrics', () => {
    const card = buildPremiumCardRoi({
      userCardId: 'a',
      creditCardId: 'c1',
      cardName: 'Premium',
      bankName: 'Bank',
      tier: 'PREMIUM',
      annualFeeInr: 5_000,
      walletValueInr: 12_000,
      spendVolumeInr: 80_000,
      benefitCounts: { lounge: 1, insurance: 0, travel: 0, fuel: 0, dining: 0, emi: 0 },
      milestoneBonusPotentialInr: 1_000,
      feeWaiverProgressPercent: null,
    });

    const overview = buildPremiumDashboardOverview({
      cards: [card],
      periodLabel: 'Test period',
    });

    expect(overview.premiumCardCount).toBe(1);
    expect(overview.totalAnnualFeesInr).toBe(5_000);
    expect(overview.bestRoiCardUserCardId).toBe('a');
    expect(overview.summary).toContain('premium card');
  });
});
