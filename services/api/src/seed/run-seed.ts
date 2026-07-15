/* eslint-disable no-await-in-loop -- sequential upserts keep FK maps deterministic */
import { loadAllSeedFiles } from '@cardwise/database-seed';
import {
  PrismaClient,
  type CardTier,
  type OfferStatus,
  type OfferType,
  type Prisma,
} from '@prisma/client';

import { newUuidV7 } from '../infrastructure/prisma/uuid';

type SeedBundle = ReturnType<typeof loadAllSeedFiles>;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type SeedResult = {
  networks: number;
  banks: number;
  rewardPrograms: number;
  spendCategories: number;
  cards: number;
  merchantCategories: number;
  merchants: number;
  aliases: number;
  mccMappings: number;
  rewardRules: number;
  offers: number;
  purged: {
    banks: number;
    merchants: number;
    merchantCategories: number;
    cards: number;
    rewardRules: number;
    offers: number;
  };
};

export async function runSeed(prisma: PrismaClient = new PrismaClient()): Promise<SeedResult> {
  const ownsClient = arguments.length === 0;
  const seed = loadAllSeedFiles();
  const counts: SeedResult = {
    networks: 0,
    banks: 0,
    rewardPrograms: 0,
    spendCategories: 0,
    cards: 0,
    merchantCategories: 0,
    merchants: 0,
    aliases: 0,
    mccMappings: 0,
    rewardRules: 0,
    offers: 0,
    purged: {
      banks: 0,
      merchants: 0,
      merchantCategories: 0,
      cards: 0,
      rewardRules: 0,
      offers: 0,
    },
  };

  const networkIds = new Map<string, string>();
  const bankIds = new Map<string, string>();
  const programIds = new Map<string, string>();
  const spendCategoryIds = new Map<string, string>();
  const cardIds = new Map<string, string>();
  const merchantCategoryIds = new Map<string, string>();
  const merchantIds = new Map<string, string>();

  try {
    await seedNetworks(prisma, seed, networkIds, counts);
    await seedBanks(prisma, seed, bankIds, counts);
    await seedRewardPrograms(prisma, seed, bankIds, programIds, counts);
    await seedSpendCategories(prisma, seed, spendCategoryIds, counts);
    await seedCards(prisma, seed, bankIds, networkIds, programIds, cardIds, counts);
    await seedMerchantCategories(prisma, seed, merchantCategoryIds, counts);
    await seedMerchants(prisma, seed, merchantCategoryIds, merchantIds, counts);
    await seedMccMappings(prisma, seed, merchantCategoryIds, counts);
    await seedRewardRules(prisma, seed, cardIds, programIds, spendCategoryIds, merchantIds, counts);
    await seedOffers(prisma, seed, bankIds, cardIds, merchantIds, counts);
    await purgeStaleCatalog(prisma, seed, counts);
  } finally {
    if (ownsClient) {
      await prisma.$disconnect();
    }
  }

  return counts;
}

async function seedNetworks(
  prisma: PrismaClient,
  seed: SeedBundle,
  networkIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const network of seed.banks.networks) {
    const existing = await prisma.cardNetwork.findFirst({ where: { code: network.code } });
    if (existing) {
      const updated = await prisma.cardNetwork.update({
        where: { id: existing.id },
        data: {
          name: network.name,
          slug: network.slug,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
      networkIds.set(network.code, updated.id);
    } else {
      const created = await prisma.cardNetwork.create({
        data: {
          id: newUuidV7(),
          code: network.code,
          name: network.name,
          slug: network.slug,
        },
      });
      networkIds.set(network.code, created.id);
    }
    counts.networks += 1;
  }
}

async function seedBanks(
  prisma: PrismaClient,
  seed: SeedBundle,
  bankIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const bank of seed.banks.banks) {
    const existing = await prisma.bank.findUnique({ where: { slug: bank.slug } });
    if (existing) {
      const updated = await prisma.bank.update({
        where: { id: existing.id },
        data: {
          name: bank.name,
          country: bank.country,
          logoUrl: bank.logoUrl ?? null,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
      bankIds.set(bank.slug, updated.id);
    } else {
      const created = await prisma.bank.create({
        data: {
          id: newUuidV7(),
          name: bank.name,
          slug: bank.slug,
          country: bank.country,
          logoUrl: bank.logoUrl ?? null,
        },
      });
      bankIds.set(bank.slug, created.id);
    }
    counts.banks += 1;
  }
}

async function seedRewardPrograms(
  prisma: PrismaClient,
  seed: SeedBundle,
  bankIds: Map<string, string>,
  programIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const program of seed.cards.rewardPrograms) {
    const issuerBankId = program.issuerBankSlug
      ? (bankIds.get(program.issuerBankSlug) ?? null)
      : null;
    if (program.issuerBankSlug && !issuerBankId) {
      throw new Error(`Unknown issuer bank slug: ${program.issuerBankSlug}`);
    }

    const existing = await prisma.rewardProgram.findUnique({ where: { slug: program.slug } });
    if (existing) {
      const updated = await prisma.rewardProgram.update({
        where: { id: existing.id },
        data: {
          name: program.name,
          issuerBankId,
          pointValueInr: program.pointValueInr ?? null,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
      programIds.set(program.slug, updated.id);
    } else {
      const created = await prisma.rewardProgram.create({
        data: {
          id: newUuidV7(),
          name: program.name,
          slug: program.slug,
          issuerBankId,
          pointValueInr: program.pointValueInr ?? null,
        },
      });
      programIds.set(program.slug, created.id);
    }
    counts.rewardPrograms += 1;
  }
}

async function seedSpendCategories(
  prisma: PrismaClient,
  seed: SeedBundle,
  spendCategoryIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const category of seed.cards.spendCategories) {
    const existing = await prisma.spendCategory.findUnique({ where: { code: category.code } });
    if (existing) {
      const updated = await prisma.spendCategory.update({
        where: { id: existing.id },
        data: {
          name: category.name,
          slug: category.slug,
          description: category.description ?? null,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
      spendCategoryIds.set(category.code, updated.id);
    } else {
      const created = await prisma.spendCategory.create({
        data: {
          id: newUuidV7(),
          code: category.code,
          name: category.name,
          slug: category.slug,
          description: category.description ?? null,
        },
      });
      spendCategoryIds.set(category.code, created.id);
    }
    counts.spendCategories += 1;
  }
}

async function seedCards(
  prisma: PrismaClient,
  seed: SeedBundle,
  bankIds: Map<string, string>,
  networkIds: Map<string, string>,
  programIds: Map<string, string>,
  cardIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const card of seed.cards.cards) {
    const bankId = bankIds.get(card.bankSlug);
    const networkId = networkIds.get(card.networkCode);
    if (!bankId || !networkId) {
      throw new Error(`Missing bank/network for card ${card.slug}`);
    }
    const rewardProgramId = card.rewardProgramSlug
      ? (programIds.get(card.rewardProgramSlug) ?? null)
      : null;
    if (card.rewardProgramSlug && !rewardProgramId) {
      throw new Error(`Unknown reward program: ${card.rewardProgramSlug}`);
    }

    const existing = await prisma.creditCard.findUnique({ where: { slug: card.slug } });
    if (existing) {
      const updated = await prisma.creditCard.update({
        where: { id: existing.id },
        data: {
          name: card.name,
          bankId,
          networkId,
          rewardProgramId,
          tier: card.tier as CardTier,
          active: card.active,
          annualFeeInr: card.annualFeeInr ?? null,
          joiningFeeInr: card.joiningFeeInr ?? null,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
      cardIds.set(card.slug, updated.id);
    } else {
      const created = await prisma.creditCard.create({
        data: {
          id: newUuidV7(),
          name: card.name,
          slug: card.slug,
          bankId,
          networkId,
          rewardProgramId,
          tier: card.tier as CardTier,
          active: card.active,
          annualFeeInr: card.annualFeeInr ?? null,
          joiningFeeInr: card.joiningFeeInr ?? null,
        },
      });
      cardIds.set(card.slug, created.id);
    }
    counts.cards += 1;
  }
}

async function seedMerchantCategories(
  prisma: PrismaClient,
  seed: SeedBundle,
  merchantCategoryIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const category of seed.merchants.categories) {
    const existing = await prisma.merchantCategory.findUnique({ where: { code: category.code } });
    if (existing) {
      const updated = await prisma.merchantCategory.update({
        where: { id: existing.id },
        data: {
          name: category.name,
          slug: category.slug,
          description: category.description ?? null,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
      merchantCategoryIds.set(category.code, updated.id);
    } else {
      const created = await prisma.merchantCategory.create({
        data: {
          id: newUuidV7(),
          code: category.code,
          name: category.name,
          slug: category.slug,
          description: category.description ?? null,
        },
      });
      merchantCategoryIds.set(category.code, created.id);
    }
    counts.merchantCategories += 1;
  }
}

async function seedMerchants(
  prisma: PrismaClient,
  seed: SeedBundle,
  merchantCategoryIds: Map<string, string>,
  merchantIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const merchant of seed.merchants.merchants) {
    const primaryCategoryId = merchant.primaryCategoryCode
      ? (merchantCategoryIds.get(merchant.primaryCategoryCode) ?? null)
      : null;
    if (merchant.primaryCategoryCode && !primaryCategoryId) {
      throw new Error(`Unknown merchant category: ${merchant.primaryCategoryCode}`);
    }

    const existing = await prisma.merchant.findUnique({ where: { slug: merchant.slug } });
    let merchantId: string;
    if (existing) {
      const updated = await prisma.merchant.update({
        where: { id: existing.id },
        data: {
          name: merchant.name,
          primaryCategoryId,
          paymentMethods: merchant.paymentMethods,
          active: merchant.active,
          website: merchant.website ?? null,
          brandName: merchant.brandName ?? null,
          parentBrand: merchant.parentBrand ?? null,
          popularityScore: merchant.popularityScore ?? 0,
          tags: merchant.tags ?? [],
          deletedAt: null,
          version: { increment: 1 },
        },
      });
      merchantId = updated.id;
    } else {
      const created = await prisma.merchant.create({
        data: {
          id: newUuidV7(),
          name: merchant.name,
          slug: merchant.slug,
          primaryCategoryId,
          paymentMethods: merchant.paymentMethods,
          active: merchant.active,
          website: merchant.website ?? null,
          brandName: merchant.brandName ?? null,
          parentBrand: merchant.parentBrand ?? null,
          popularityScore: merchant.popularityScore ?? 0,
          tags: merchant.tags ?? [],
        },
      });
      merchantId = created.id;
    }
    merchantIds.set(merchant.slug, merchantId);
    counts.merchants += 1;

    for (const alias of merchant.aliases) {
      const normalized = normalizeAlias(alias);
      const existingAlias = await prisma.merchantAlias.findFirst({
        where: { merchantId, normalizedAlias: normalized },
      });
      if (existingAlias) {
        await prisma.merchantAlias.update({
          where: { id: existingAlias.id },
          data: { alias, deletedAt: null, version: { increment: 1 } },
        });
      } else {
        await prisma.merchantAlias.create({
          data: {
            id: newUuidV7(),
            merchantId,
            alias,
            normalizedAlias: normalized,
          },
        });
      }
      counts.aliases += 1;
    }
  }
}

async function seedMccMappings(
  prisma: PrismaClient,
  seed: SeedBundle,
  merchantCategoryIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const mapping of seed.merchants.mccMappings ?? []) {
    const categoryId = merchantCategoryIds.get(mapping.categoryCode);
    if (!categoryId) {
      throw new Error(`Unknown merchant category for MCC: ${mapping.categoryCode}`);
    }

    const existing = await prisma.mccMapping.findFirst({
      where: {
        mccCode: mapping.mccCode,
        merchantId: null,
        deletedAt: null,
      },
    });

    if (existing) {
      await prisma.mccMapping.update({
        where: { id: existing.id },
        data: {
          categoryId,
          description: mapping.description ?? null,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
    } else {
      await prisma.mccMapping.create({
        data: {
          id: newUuidV7(),
          mccCode: mapping.mccCode,
          categoryId,
          description: mapping.description ?? null,
        },
      });
    }
    counts.mccMappings += 1;
  }
}

async function seedRewardRules(
  prisma: PrismaClient,
  seed: SeedBundle,
  cardIds: Map<string, string>,
  programIds: Map<string, string>,
  spendCategoryIds: Map<string, string>,
  merchantIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const rule of seed.rewardRules.rules) {
    const creditCardId = cardIds.get(rule.cardSlug);
    if (!creditCardId) {
      throw new Error(`Unknown card slug for rule: ${rule.cardSlug}`);
    }
    const rewardProgramId = rule.rewardProgramSlug
      ? (programIds.get(rule.rewardProgramSlug) ?? null)
      : null;
    const spendCategoryId = rule.spendCategoryCode
      ? (spendCategoryIds.get(rule.spendCategoryCode) ?? null)
      : null;
    const merchantId = rule.merchantSlug ? (merchantIds.get(rule.merchantSlug) ?? null) : null;

    let ruleRow = await prisma.rewardRule.findUnique({ where: { ruleKey: rule.ruleKey } });
    if (ruleRow) {
      ruleRow = await prisma.rewardRule.update({
        where: { id: ruleRow.id },
        data: {
          name: rule.name,
          creditCardId,
          rewardProgramId,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
    } else {
      ruleRow = await prisma.rewardRule.create({
        data: {
          id: newUuidV7(),
          ruleKey: rule.ruleKey,
          name: rule.name,
          creditCardId,
          rewardProgramId,
        },
      });
    }

    const active = await prisma.rewardRuleVersion.findFirst({
      where: { ruleId: ruleRow.id, status: 'ACTIVE', deletedAt: null },
    });

    const versionData = {
      spendCategoryId,
      merchantId,
      payload: rule.payload as Prisma.InputJsonValue,
      validFrom: parseDate(rule.validFrom),
      validUntil: parseDate(rule.validUntil ?? null),
      status: 'ACTIVE' as const,
      activatedAt: new Date(),
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
          ruleId: ruleRow.id,
          versionNumber: 1,
          ...versionData,
        },
      });
    }

    counts.rewardRules += 1;
  }
}

async function seedOffers(
  prisma: PrismaClient,
  seed: SeedBundle,
  bankIds: Map<string, string>,
  cardIds: Map<string, string>,
  merchantIds: Map<string, string>,
  counts: SeedResult,
) {
  for (const offer of seed.offers.offers) {
    const issuerBankId = offer.issuerBankSlug ? (bankIds.get(offer.issuerBankSlug) ?? null) : null;
    if (offer.issuerBankSlug && !issuerBankId) {
      throw new Error(`Unknown issuer bank for offer: ${offer.issuerBankSlug}`);
    }

    const validFrom = parseDate(offer.validFrom);
    if (!validFrom) {
      throw new Error(`Offer ${offer.code} missing validFrom`);
    }

    let offerRow = await prisma.offer.findUnique({ where: { code: offer.code } });
    if (offerRow) {
      offerRow = await prisma.offer.update({
        where: { id: offerRow.id },
        data: {
          slug: offer.slug,
          title: offer.title,
          description: offer.description ?? null,
          type: offer.type as OfferType,
          issuerBankId,
          cashbackPercent: offer.cashbackPercent ?? null,
          capInr: offer.capInr ?? null,
          termsSummary: offer.termsSummary ?? null,
          validFrom,
          validUntil: parseDate(offer.validUntil ?? null),
          status: offer.status as OfferStatus,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
    } else {
      offerRow = await prisma.offer.create({
        data: {
          id: newUuidV7(),
          code: offer.code,
          slug: offer.slug,
          title: offer.title,
          description: offer.description ?? null,
          type: offer.type as OfferType,
          issuerBankId,
          cashbackPercent: offer.cashbackPercent ?? null,
          capInr: offer.capInr ?? null,
          termsSummary: offer.termsSummary ?? null,
          validFrom,
          validUntil: parseDate(offer.validUntil ?? null),
          status: offer.status as OfferStatus,
        },
      });
    }

    for (const cardSlug of offer.cardSlugs) {
      const creditCardId = cardIds.get(cardSlug);
      if (!creditCardId) {
        throw new Error(`Unknown card for offer assignment: ${cardSlug}`);
      }
      const existing = await prisma.offerCardAssignment.findFirst({
        where: { offerId: offerRow.id, creditCardId },
      });
      if (existing) {
        await prisma.offerCardAssignment.update({
          where: { id: existing.id },
          data: { deletedAt: null, version: { increment: 1 } },
        });
      } else {
        await prisma.offerCardAssignment.create({
          data: {
            id: newUuidV7(),
            offerId: offerRow.id,
            creditCardId,
          },
        });
      }
    }

    for (const merchantSlug of offer.merchantSlugs) {
      const merchantId = merchantIds.get(merchantSlug);
      if (!merchantId) {
        throw new Error(`Unknown merchant for offer: ${merchantSlug}`);
      }
      const existing = await prisma.offerMerchant.findFirst({
        where: { offerId: offerRow.id, merchantId },
      });
      if (existing) {
        await prisma.offerMerchant.update({
          where: { id: existing.id },
          data: { deletedAt: null, version: { increment: 1 } },
        });
      } else {
        await prisma.offerMerchant.create({
          data: {
            id: newUuidV7(),
            offerId: offerRow.id,
            merchantId,
          },
        });
      }
    }

    counts.offers += 1;
  }
}

function slugNotIn<T extends string>(values: Set<T>) {
  return values.size > 0 ? { notIn: [...values] as T[] } : undefined;
}

/** Soft-delete catalog rows that are no longer in version-controlled seed files. */
async function purgeStaleCatalog(prisma: PrismaClient, seed: SeedBundle, counts: SeedResult) {
  const now = new Date();
  const seedBankSlugs = new Set(seed.banks.banks.map((b) => b.slug));
  const seedMerchantSlugs = new Set(seed.merchants.merchants.map((m) => m.slug));
  const seedCategoryCodes = new Set(seed.merchants.categories.map((c) => c.code));
  const seedCardSlugs = new Set(seed.cards.cards.map((c) => c.slug));
  const seedRuleKeys = new Set(seed.rewardRules.rules.map((r) => r.ruleKey));
  const seedOfferCodes = new Set(seed.offers.offers.map((o) => o.code));
  const seedProgramSlugs = new Set(seed.cards.rewardPrograms.map((p) => p.slug));

  const offerCodeFilter = slugNotIn(seedOfferCodes);
  const staleOffers = await prisma.offer.updateMany({
    where: {
      deletedAt: null,
      ...(offerCodeFilter ? { code: offerCodeFilter } : {}),
    },
    data: { deletedAt: now, version: { increment: 1 } },
  });
  counts.purged.offers = staleOffers.count;

  const ruleKeyFilter = slugNotIn(seedRuleKeys);
  const staleRuleRows = await prisma.rewardRule.findMany({
    where: {
      deletedAt: null,
      ...(ruleKeyFilter ? { ruleKey: ruleKeyFilter } : {}),
    },
    select: { id: true },
  });
  if (staleRuleRows.length > 0) {
    await prisma.rewardRuleVersion.updateMany({
      where: { ruleId: { in: staleRuleRows.map((r) => r.id) }, deletedAt: null },
      data: {
        deletedAt: now,
        status: 'INACTIVE',
        deactivatedAt: now,
        version: { increment: 1 },
      },
    });
    const staleRules = await prisma.rewardRule.updateMany({
      where: { id: { in: staleRuleRows.map((r) => r.id) } },
      data: { deletedAt: now, version: { increment: 1 } },
    });
    counts.purged.rewardRules = staleRules.count;
  }

  const cardSlugFilter = slugNotIn(seedCardSlugs);
  const staleCards = await prisma.creditCard.updateMany({
    where: {
      deletedAt: null,
      ...(cardSlugFilter ? { slug: cardSlugFilter } : {}),
    },
    data: { deletedAt: now, active: false, version: { increment: 1 } },
  });
  counts.purged.cards = staleCards.count;

  const merchantSlugFilter = slugNotIn(seedMerchantSlugs);
  const staleMerchants = await prisma.merchant.updateMany({
    where: {
      deletedAt: null,
      ...(merchantSlugFilter ? { slug: merchantSlugFilter } : {}),
    },
    data: { deletedAt: now, active: false, version: { increment: 1 } },
  });
  counts.purged.merchants = staleMerchants.count;

  const categoryCodeFilter = slugNotIn(seedCategoryCodes);
  const staleCategories = await prisma.merchantCategory.updateMany({
    where: {
      deletedAt: null,
      ...(categoryCodeFilter ? { code: categoryCodeFilter } : {}),
    },
    data: { deletedAt: now, version: { increment: 1 } },
  });
  counts.purged.merchantCategories = staleCategories.count;

  await prisma.merchantAlias.updateMany({
    where: {
      deletedAt: null,
      merchant: {
        deletedAt: { not: null },
      },
    },
    data: { deletedAt: now, version: { increment: 1 } },
  });

  const bankSlugFilter = slugNotIn(seedBankSlugs);
  const staleBanks = await prisma.bank.updateMany({
    where: {
      deletedAt: null,
      ...(bankSlugFilter ? { slug: bankSlugFilter } : {}),
    },
    data: { deletedAt: now, version: { increment: 1 } },
  });
  counts.purged.banks = staleBanks.count;

  const programSlugFilter = slugNotIn(seedProgramSlugs);
  await prisma.rewardProgram.updateMany({
    where: {
      deletedAt: null,
      ...(programSlugFilter ? { slug: programSlugFilter } : {}),
    },
    data: { deletedAt: now, version: { increment: 1 } },
  });
}
