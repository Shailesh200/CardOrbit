import { describe, expect, it } from 'vitest';

import {
  buildCatalogForCard,
  buildRecommendations,
  computeRedemptionValue,
  pickBestValueOptionId,
  validateRedemption,
} from '../redemption-catalog';

describe('computeRedemptionValue', () => {
  it('values flights above statement credit for the same points', () => {
    const flights = computeRedemptionValue({
      points: 10_000,
      balanceKind: 'POINTS',
      pointValueInr: 0.25,
      optionType: 'FLIGHTS',
    });
    const statement = computeRedemptionValue({
      points: 10_000,
      balanceKind: 'POINTS',
      pointValueInr: 0.25,
      optionType: 'STATEMENT_CREDIT',
    });

    expect(flights.estimatedValueInr).toBeGreaterThan(statement.estimatedValueInr);
    expect(flights.estimatedValueInr).toBe(3125);
    expect(statement.estimatedValueInr).toBe(2500);
  });

  it('treats cashback 1:1 in INR', () => {
    const value = computeRedemptionValue({
      points: 1500,
      balanceKind: 'CASHBACK',
      pointValueInr: 0.25,
      optionType: 'CASHBACK',
    });

    expect(value.estimatedValueInr).toBe(1500);
  });
});

describe('validateRedemption', () => {
  it('rejects redemptions below minimum points', () => {
    const result = validateRedemption({
      availablePoints: 4000,
      balanceKind: 'POINTS',
      pointValueInr: 0.25,
      optionType: 'FLIGHTS',
      pointsToRedeem: 1000,
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Minimum');
  });

  it('accepts eligible redemptions with estimated value', () => {
    const result = validateRedemption({
      availablePoints: 20_000,
      balanceKind: 'POINTS',
      pointValueInr: 0.25,
      optionType: 'STATEMENT_CREDIT',
      pointsToRedeem: 5000,
    });

    expect(result.eligible).toBe(true);
    expect(result.estimatedValueInr).toBe(1250);
  });
});

describe('buildCatalogForCard', () => {
  it('builds options for each applicable balance kind', () => {
    const options = buildCatalogForCard({
      userCardId: 'card-1',
      cardName: 'Rewards Card',
      bankName: 'Test Bank',
      pointValueInr: 0.25,
      balances: [
        {
          kind: 'POINTS',
          availableAmount: 12_000,
          expiringAmount: 0,
          expiringAt: null,
        },
      ],
    });

    expect(options.length).toBeGreaterThan(3);
    expect(options.some((row) => row.optionType === 'FLIGHTS' && row.eligible)).toBe(true);
    expect(pickBestValueOptionId(options)).toBeTruthy();
  });
});

describe('buildRecommendations', () => {
  it('ranks higher-value options first', () => {
    const options = buildCatalogForCard({
      userCardId: 'card-1',
      cardName: 'Rewards Card',
      bankName: 'Test Bank',
      pointValueInr: 0.25,
      balances: [
        {
          kind: 'POINTS',
          availableAmount: 20_000,
          expiringAmount: 0,
          expiringAt: null,
        },
      ],
    });

    const { recommendations } = buildRecommendations(options, [
      {
        userCardId: 'card-1',
        cardName: 'Rewards Card',
        kind: 'POINTS',
        availableAmount: 20_000,
        expiringAmount: 0,
        expiringAt: null,
      },
    ]);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]?.optionType).toBe('FLIGHTS');
  });
});
