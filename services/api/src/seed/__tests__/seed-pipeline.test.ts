import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadAllSeedFiles } from '@cardwise/database-seed';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { runSeed } from '../run-seed';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('seed pipeline (M-010)', () => {
  const prisma = new PrismaService();
  const seed = loadAllSeedFiles();

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds catalogs and is idempotent on re-run', async () => {
    const result = await runSeed(prisma);
    const firstCards = await prisma.creditCard.count({ where: { deletedAt: null } });
    const firstMerchants = await prisma.merchant.count({ where: { deletedAt: null } });
    const firstRules = await prisma.rewardRule.count({ where: { deletedAt: null } });
    const firstOffers = await prisma.offer.count({ where: { deletedAt: null } });
    const firstActiveVersions = await prisma.rewardRuleVersion.count({
      where: { status: 'ACTIVE', deletedAt: null },
    });

    expect(firstMerchants).toBe(seed.merchants.merchants.length);
    expect(firstCards).toBe(seed.cards.cards.length);
    expect(firstRules).toBe(seed.rewardRules.rules.length);
    expect(firstOffers).toBe(seed.offers.offers.length);
    expect(result.purged.merchants).toBeGreaterThanOrEqual(0);

    await runSeed(prisma);

    expect(await prisma.creditCard.count({ where: { deletedAt: null } })).toBe(firstCards);
    expect(await prisma.merchant.count({ where: { deletedAt: null } })).toBe(firstMerchants);
    expect(await prisma.rewardRule.count({ where: { deletedAt: null } })).toBe(firstRules);
    expect(await prisma.offer.count({ where: { deletedAt: null } })).toBe(firstOffers);
    expect(
      await prisma.rewardRuleVersion.count({ where: { status: 'ACTIVE', deletedAt: null } }),
    ).toBe(firstActiveVersions);

    const amazon = await prisma.merchant.findUnique({
      where: { slug: 'amazon' },
    });
    expect(amazon).not.toBeNull();
  }, 120_000);
});
