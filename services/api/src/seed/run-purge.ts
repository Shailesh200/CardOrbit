/* eslint-disable no-await-in-loop -- ordered deletes respect FK constraints */
import { PrismaClient } from '@prisma/client';

export type PurgeResult = {
  catalogImportItems: number;
  catalogImportBatches: number;
  offerMerchants: number;
  offerCardAssignments: number;
  offers: number;
  rewardRuleVersions: number;
  rewardRules: number;
  userCards: number;
  creditCards: number;
  rewardPrograms: number;
  merchantAliases: number;
  mccMappings: number;
  merchants: number;
  merchantCategories: number;
  spendCategories: number;
  banks: number;
  cardNetworks: number;
};

/**
 * Removes all catalog/seed data while preserving admin users, AI prompts, and consumer accounts.
 * Use after migrating to worker-driven ingest-only catalog population.
 */
export async function runPurge(prisma: PrismaClient = new PrismaClient()): Promise<PurgeResult> {
  const ownsClient = arguments.length === 0;
  const counts: PurgeResult = {
    catalogImportItems: 0,
    catalogImportBatches: 0,
    offerMerchants: 0,
    offerCardAssignments: 0,
    offers: 0,
    rewardRuleVersions: 0,
    rewardRules: 0,
    userCards: 0,
    creditCards: 0,
    rewardPrograms: 0,
    merchantAliases: 0,
    mccMappings: 0,
    merchants: 0,
    merchantCategories: 0,
    spendCategories: 0,
    banks: 0,
    cardNetworks: 0,
  };

  try {
    const importItems = await prisma.catalogImportItem.deleteMany({});
    counts.catalogImportItems = importItems.count;

    const importBatches = await prisma.catalogImportBatch.deleteMany({});
    counts.catalogImportBatches = importBatches.count;

    const offerMerchants = await prisma.offerMerchant.deleteMany({});
    counts.offerMerchants = offerMerchants.count;

    const offerCards = await prisma.offerCardAssignment.deleteMany({});
    counts.offerCardAssignments = offerCards.count;

    const offers = await prisma.offer.deleteMany({});
    counts.offers = offers.count;

    const ruleVersions = await prisma.rewardRuleVersion.deleteMany({});
    counts.rewardRuleVersions = ruleVersions.count;

    const rules = await prisma.rewardRule.deleteMany({});
    counts.rewardRules = rules.count;

    const userCards = await prisma.userCard.deleteMany({});
    counts.userCards = userCards.count;

    const cards = await prisma.creditCard.deleteMany({});
    counts.creditCards = cards.count;

    const programs = await prisma.rewardProgram.deleteMany({});
    counts.rewardPrograms = programs.count;

    const aliases = await prisma.merchantAlias.deleteMany({});
    counts.merchantAliases = aliases.count;

    const mcc = await prisma.mccMapping.deleteMany({});
    counts.mccMappings = mcc.count;

    const merchants = await prisma.merchant.deleteMany({});
    counts.merchants = merchants.count;

    const merchantCategories = await prisma.merchantCategory.deleteMany({});
    counts.merchantCategories = merchantCategories.count;

    const spendCategories = await prisma.spendCategory.deleteMany({});
    counts.spendCategories = spendCategories.count;

    const banks = await prisma.bank.deleteMany({});
    counts.banks = banks.count;

    const networks = await prisma.cardNetwork.deleteMany({});
    counts.cardNetworks = networks.count;
  } finally {
    if (ownsClient) {
      await prisma.$disconnect();
    }
  }

  return counts;
}
