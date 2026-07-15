import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeParseRewardRulePayload } from '@cardwise/validation';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import {
  PrismaBankRepository,
  PrismaCardNetworkRepository,
  PrismaCreditCardRepository,
} from '../../cards/infrastructure/prisma-card-catalog.repository';
import { PrismaRewardRuleRepository } from '../infrastructure/prisma-reward-rule.repository';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const fixturesPath = join(__dirname, '../fixtures/example-reward-rules.json');

describe('reward rule fixtures + Zod (M-008)', () => {
  it('validates example fixtures', () => {
    const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8')) as Array<{
      payload: unknown;
    }>;
    expect(fixtures.length).toBeGreaterThan(0);
    for (const fixture of fixtures) {
      const parsed = safeParseRewardRulePayload(fixture.payload);
      expect(parsed.success).toBe(true);
    }
  });

  it('rejects invalid rule payloads', () => {
    const result = safeParseRewardRulePayload({
      rewardMultiplier: 0,
      cap: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe.skipIf(!hasDatabase)('reward rule repositories (M-008)', () => {
  const prisma = new PrismaService();
  const banks = new PrismaBankRepository(prisma);
  const networks = new PrismaCardNetworkRepository(prisma);
  const cards = new PrismaCreditCardRepository(prisma);
  const rewardRules = new PrismaRewardRuleRepository(prisma);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createCard() {
    const id = newUuidV7();
    const bank = await banks.create({
      name: `Reward Bank ${id}`,
      slug: `reward-bank-${id}`,
    });
    const network = await networks.create({
      code: `RR_${id.replace(/-/g, '').slice(0, 12)}`,
      name: `Reward Net ${id}`,
      slug: `reward-net-${id}`,
    });
    const card = await cards.create({
      name: `Reward Card ${id}`,
      slug: `reward-card-${id}`,
      bankId: bank.id,
      networkId: network.id,
    });
    return { id, card };
  }

  it('creates versions, activates, deactivates, and lists history', async () => {
    const { id, card } = await createCard();
    const ruleKey = `test_rule_${id}`;

    const rule = await rewardRules.createRule({
      ruleKey,
      name: `Test Rule ${id}`,
      creditCardId: card.id,
    });

    const v1 = await rewardRules.createVersion({
      ruleId: rule.id,
      versionNumber: 1,
      payload: { rewardMultiplier: 3, cap: 10000, exclusions: ['fuel'] },
    });
    expect(v1.status).toBe('DRAFT');

    const activated = await rewardRules.activateVersion(v1.id);
    expect(activated.status).toBe('ACTIVE');

    const v2 = await rewardRules.createVersion({
      ruleId: rule.id,
      versionNumber: 2,
      payload: { rewardMultiplier: 5, cap: 15000, exclusions: ['fuel', 'rent'] },
    });

    const activatedV2 = await rewardRules.activateVersion(v2.id);
    expect(activatedV2.status).toBe('ACTIVE');

    const history = await rewardRules.listVersionHistory(ruleKey);
    expect(history.map((v) => v.versionNumber)).toEqual([1, 2]);
    expect(history.find((v) => v.versionNumber === 1)?.status).toBe('INACTIVE');
    expect(history.find((v) => v.versionNumber === 2)?.status).toBe('ACTIVE');

    const active = await rewardRules.listActive();
    expect(active.some((row) => row.rule.ruleKey === ruleKey)).toBe(true);

    await rewardRules.deactivateVersion(v2.id);
    const afterDeactivate = await rewardRules.listActive();
    expect(afterDeactivate.find((row) => row.rule.ruleKey === ruleKey)).toBeUndefined();
  });

  it('rejects invalid payloads on createVersion', async () => {
    const { id, card } = await createCard();
    const rule = await rewardRules.createRule({
      ruleKey: `invalid_payload_${id}`,
      name: `Invalid ${id}`,
      creditCardId: card.id,
    });

    await expect(
      rewardRules.createVersion({
        ruleId: rule.id,
        versionNumber: 1,
        payload: { cap: 100 },
      }),
    ).rejects.toThrow();
  });
});
