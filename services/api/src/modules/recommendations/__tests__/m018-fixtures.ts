import type { PrismaClient } from '@prisma/client';

import { newUuidV7 } from '../../../infrastructure/prisma/uuid';

export type M018FixtureCards = {
  premium: { id: string; slug: string };
  standard: { id: string; slug: string };
  showcase: Array<{ id: string; slug: string }>;
};

const FIXTURE_PREFIX = 'm018-fixture';

/** Creates isolated catalog cards + reward rules for recommendation integration tests. */
export async function ensureM018FixtureCards(prisma: PrismaClient): Promise<M018FixtureCards> {
  const bank = await prisma.bank.findUniqueOrThrow({ where: { slug: 'hdfc' } });
  const network = await prisma.cardNetwork.findFirstOrThrow({ where: { code: 'VISA' } });
  const program = await prisma.rewardProgram.findUniqueOrThrow({
    where: { slug: 'hdfc-rewards' },
  });
  const shopping = await prisma.spendCategory.findUniqueOrThrow({ where: { code: 'SHOPPING' } });
  const dining = await prisma.spendCategory.findUniqueOrThrow({ where: { code: 'DINING' } });

  const premiumSlug = `${FIXTURE_PREFIX}-premium`;
  const standardSlug = `${FIXTURE_PREFIX}-standard`;
  const extraSlugs = [`${FIXTURE_PREFIX}-showcase-a`, `${FIXTURE_PREFIX}-showcase-b`];

  async function upsertCard(slug: string, name: string) {
    const existing = await prisma.creditCard.findUnique({ where: { slug } });
    if (existing) {
      return prisma.creditCard.update({
        where: { id: existing.id },
        data: { deletedAt: null, active: true, version: { increment: 1 } },
      });
    }
    return prisma.creditCard.create({
      data: {
        id: newUuidV7(),
        name,
        slug,
        bankId: bank.id,
        networkId: network.id,
        rewardProgramId: program.id,
        tier: 'PREMIUM',
        active: true,
      },
    });
  }

  async function upsertRule(
    cardId: string,
    ruleKey: string,
    spendCategoryId: string,
    cashbackPercent: number,
  ) {
    let rule = await prisma.rewardRule.findUnique({ where: { ruleKey } });
    if (!rule) {
      rule = await prisma.rewardRule.create({
        data: {
          id: newUuidV7(),
          ruleKey,
          name: ruleKey,
          creditCardId: cardId,
          rewardProgramId: program.id,
        },
      });
    } else {
      rule = await prisma.rewardRule.update({
        where: { id: rule.id },
        data: { deletedAt: null, creditCardId: cardId, version: { increment: 1 } },
      });
    }

    const active = await prisma.rewardRuleVersion.findFirst({
      where: { ruleId: rule.id, status: 'ACTIVE', deletedAt: null },
    });

    const versionData = {
      spendCategoryId,
      merchantId: null,
      payload: { cashbackPercent, exclusions: [] },
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validUntil: null,
      status: 'ACTIVE' as const,
      activatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deactivatedAt: null,
      deletedAt: null,
    };

    if (active) {
      await prisma.rewardRuleVersion.update({
        where: { id: active.id },
        data: { ...versionData, version: { increment: 1 } },
      });
    } else {
      await prisma.rewardRuleVersion.create({
        data: {
          id: newUuidV7(),
          ruleId: rule.id,
          versionNumber: 1,
          ...versionData,
        },
      });
    }
  }

  const premium = await upsertCard(premiumSlug, 'M018 Fixture Premium');
  const standard = await upsertCard(standardSlug, 'M018 Fixture Standard');
  const showcaseA = await upsertCard(extraSlugs[0]!, 'M018 Fixture Showcase A');
  const showcaseB = await upsertCard(extraSlugs[1]!, 'M018 Fixture Showcase B');

  await upsertRule(premium.id, `${premiumSlug}-shopping`, shopping.id, 5);
  await upsertRule(standard.id, `${standardSlug}-shopping`, shopping.id, 2);
  await upsertRule(premium.id, `${premiumSlug}-dining`, dining.id, 4);
  await upsertRule(standard.id, `${standardSlug}-dining`, dining.id, 2);
  await upsertRule(showcaseA.id, `${extraSlugs[0]}-dining`, dining.id, 3);
  await upsertRule(showcaseB.id, `${extraSlugs[1]}-dining`, dining.id, 6);

  return {
    premium: { id: premium.id, slug: premium.slug },
    standard: { id: standard.id, slug: standard.slug },
    showcase: [
      { id: premium.id, slug: premium.slug },
      { id: standard.id, slug: standard.slug },
      { id: showcaseA.id, slug: showcaseA.slug },
      { id: showcaseB.id, slug: showcaseB.slug },
    ],
  };
}
