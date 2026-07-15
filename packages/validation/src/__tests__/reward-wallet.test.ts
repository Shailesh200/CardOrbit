import { describe, expect, it } from 'vitest';

import { parseUpsertRewardWalletInput, UpsertRewardWalletInputSchema } from '../reward-wallet';

describe('reward wallet validation', () => {
  it('parses upsert input', () => {
    const parsed = parseUpsertRewardWalletInput({
      balances: [
        { kind: 'POINTS', availableAmount: 12000, expiringAmount: 500, expiringAt: null },
        { kind: 'CASHBACK', availableAmount: 350 },
      ],
    });
    expect(parsed.balances).toHaveLength(2);
  });

  it('rejects negative balances', () => {
    expect(() =>
      UpsertRewardWalletInputSchema.parse({
        balances: [{ kind: 'POINTS', availableAmount: -1 }],
      }),
    ).toThrow();
  });
});
