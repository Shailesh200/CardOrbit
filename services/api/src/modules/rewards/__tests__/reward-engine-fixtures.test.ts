import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { calculateReward } from '../domain/services/reward-calculator';

const fixturesPath = join(__dirname, '../fixtures/example-reward-rules.json');
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8')) as Array<{
  name: string;
  payload: {
    rewardMultiplier?: number;
    cashbackPercent?: number;
    cap?: number;
    monthlyLimit?: number;
    spendThreshold?: number;
    milestoneBonus?: number;
    exclusions: string[];
  };
}>;

describe('calculateReward — seeded fixture rules (M-017)', () => {
  it.each(fixtures.map((fixture) => [fixture.name, fixture.payload] as const))(
    'evaluates fixture %s without hardcoded rates',
    (_name, payload) => {
      const result = calculateReward({
        amountInr: 25000,
        payload,
        pointValueInr: 0.25,
        exclusionTags: [],
        at: new Date('2026-06-01T00:00:00.000Z'),
      });
      expect(result).not.toBeNull();
      expect(result!.estimatedValueInr).toBeGreaterThanOrEqual(0);
      expect(result!.explanation.length).toBeGreaterThan(0);
    },
  );

  it('HDFC Infinia travel fixture at ₹25k yields capped points value', () => {
    const payload = fixtures[0]!.payload;
    const result = calculateReward({
      amountInr: 25000,
      payload,
      pointValueInr: 0.25,
      exclusionTags: [],
      at: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(result?.rewardPoints).toBe(1250);
    expect(result?.estimatedValueInr).toBe(312.5);
  });

  it('SBI cashback fixture respects monthly limit', () => {
    const payload = fixtures[1]!.payload;
    const result = calculateReward({
      amountInr: 50000,
      payload,
      pointValueInr: 0.25,
      exclusionTags: [],
      at: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(result?.cashbackInr).toBe(2500);
    expect(result?.estimatedValueInr).toBe(2500);
    expect(result?.capped).toBe(false);
  });

  it('Axis ACE milestone fixture adds bonus above threshold', () => {
    const payload = fixtures[2]!.payload;
    const result = calculateReward({
      amountInr: 15000,
      payload,
      pointValueInr: 0.25,
      exclusionTags: [],
      at: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(result?.milestoneBonusInr).toBe(250);
    expect(result?.cashbackInr).toBe(300);
    expect(result?.estimatedValueInr).toBe(550);
  });
});
