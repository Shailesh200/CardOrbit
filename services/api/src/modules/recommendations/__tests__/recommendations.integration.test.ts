import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash as bcryptHash } from 'bcryptjs';

import {
  clearMemoryEvents,
  getMemoryEvents,
  initAnalytics,
  shutdownAnalytics,
} from '@cardwise/analytics';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RewardRuleEvaluatorService } from '../../rewards/infrastructure/reward-rule-evaluator.service';
import { PrismaRewardRuleRepository } from '../../rewards/infrastructure/prisma-reward-rule.repository';
import { FindMerchantByAliasQuery } from '../../merchants/application/queries/find-by-alias.query';
import {
  PrismaMerchantAliasRepository,
  PrismaMerchantCategoryRepository,
  PrismaMerchantRepository,
} from '../../merchants/infrastructure/prisma-merchant.repository';
import { UserCardsService } from '../../user-cards/user-cards.service';
import type { MailSyncService } from '../../mail-sync/mail-sync.service';
import { createPermissiveFeatureFlagsService } from '../../feature-flags/__tests__/feature-flags.test-helper';
import { RankingSignalsService } from '../ranking-signals.service';
import { RecommendationHistoryService } from '../recommendation-history.service';
import { StrategicSignalsService } from '../domain/services/strategic-signals.service';
import { RecommendationsService } from '../recommendations.service';
import { ensureM018FixtureCards, type M018FixtureCards } from './m018-fixtures';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('recommendations engine (M-018)', () => {
  const prisma = new PrismaService();
  const featureFlags = createPermissiveFeatureFlagsService();
  const mailSync = {
    enqueueSyncAfterCardAdd: async () => undefined,
  } as unknown as MailSyncService;
  const portfolio = new UserCardsService(prisma, featureFlags, mailSync);
  const rewardRules = new PrismaRewardRuleRepository(prisma);
  const rewardEvaluator = new RewardRuleEvaluatorService(
    rewardRules,
    new PrismaMerchantRepository(prisma),
    new PrismaMerchantCategoryRepository(prisma),
  );
  const findMerchantByAlias = new FindMerchantByAliasQuery(
    new PrismaMerchantAliasRepository(prisma),
  );
  const rankingSignals = {
    enrichPreferences: async (input: { basePreferences: Record<string, unknown> }) => ({
      preferences: input.basePreferences,
      aiPreferenceWeight: 0,
    }),
  } as unknown as RankingSignalsService;
  const recommendationHistory = {
    persistRecommendation: async () => undefined,
  } as unknown as RecommendationHistoryService;
  const strategicSignals = {
    loadSignals: async () => ({
      isTravelCategory: false,
      signalsByUserCardId: {},
    }),
  } as unknown as StrategicSignalsService;
  const recommendations = new RecommendationsService(
    prisma,
    rewardEvaluator,
    findMerchantByAlias,
    featureFlags,
    rankingSignals,
    recommendationHistory,
    strategicSignals,
  );
  let fixtures: M018FixtureCards | undefined;

  beforeAll(async () => {
    await prisma.$connect();
    initAnalytics({ useMemory: true });
    const bank = await prisma.bank.findUnique({ where: { slug: 'hdfc-bank' } });
    if (!bank) {
      console.warn('M-018 integration tests skipped — run `bun run db:seed` first');
      return;
    }
    fixtures = await ensureM018FixtureCards(prisma);
  });

  afterAll(async () => {
    await shutdownAnalytics();
    await prisma.$disconnect();
  });

  async function createUser(email: string) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: await bcryptHash('Str0ng!Passw0rd', 10),
        emailVerifiedAt: new Date(),
        fullName: 'Recommendation User',
        role: 'USER',
      },
    });
  }

  it('ranks portfolio cards for shopping spend and emits analytics events', async ({ skip }) => {
    if (!fixtures) {
      skip();
      return;
    }
    clearMemoryEvents();
    const user = await createUser(`m018-reco-${Date.now()}@cardwise.test`);

    await portfolio.addCard(user.id, { creditCardId: fixtures.premium.id });
    await portfolio.addCard(user.id, { creditCardId: fixtures.standard.id });

    const result = await recommendations.recommendBestCard(user.id, {
      amount: 25000,
      categorySlug: 'shopping',
    });

    expect(result.cardsEvaluated).toBe(2);
    expect(result.recommendedCard).not.toBeNull();
    expect(result.recommendedCard!.creditCardId).toBe(fixtures.premium.id);
    expect(result.recommendedCard!.expectedRewardInr).toBeGreaterThan(0);
    expect(result.recommendedCard!.score).toBe(100);
    expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.explanationSource).toBe('template');
    expect(result.calculationBreakdown).not.toBeNull();
    expect(result.citations.length).toBeGreaterThan(0);

    const requested = getMemoryEvents().filter(
      (event) => event.event === 'RECOMMENDATION_REQUESTED',
    );
    const viewed = getMemoryEvents().filter((event) => event.event === 'RECOMMENDATION_VIEWED');
    expect(requested).toHaveLength(1);
    expect(viewed).toHaveLength(1);
    expect(viewed[0]?.properties).toMatchObject({
      recommendedCardId: result.recommendedCard!.creditCardId,
      amount: 25000,
    });
  });

  it('resolves merchant slug and returns deterministic ranking', async ({ skip }) => {
    if (!fixtures) {
      skip();
      return;
    }
    const user = await createUser(`m018-merchant-${Date.now()}@cardwise.test`);
    await portfolio.addCard(user.id, { creditCardId: fixtures.premium.id });

    const result = await recommendations.recommendBestCard(user.id, {
      amount: 10000,
      merchantSlug: 'amazon',
      categorySlug: 'shopping',
    });

    expect(result.merchant?.slug).toBe('amazon');
    expect(result.recommendedCard?.creditCardId).toBe(fixtures.premium.id);
  });

  it('admin audit returns all evaluated cards including ineligible ones', async ({ skip }) => {
    if (!fixtures) {
      skip();
      return;
    }
    const user = await createUser(`m018-audit-${Date.now()}@cardwise.test`);
    await portfolio.addCard(user.id, { creditCardId: fixtures.premium.id });

    const audit = await recommendations.auditRecommendation({
      userId: user.id,
      amount: 15000,
      categorySlug: 'shopping',
    });

    expect(audit.userId).toBe(user.id);
    expect(audit.audit).toHaveLength(1);
    expect(audit.audit[0]?.cardSlug).toBe(fixtures.premium.slug);
  });

  it('rejects recommendation when portfolio is empty', async () => {
    const user = await createUser(`m018-empty-${Date.now()}@cardwise.test`);

    await expect(
      recommendations.recommendBestCard(user.id, {
        amount: 5000,
        categorySlug: 'shopping',
      }),
    ).rejects.toThrow(/portfolio/i);
  });

  it('showcase ranks active catalog cards for Swiggy dining without a user', async () => {
    const result = await recommendations.recommendShowcase();

    expect(result.source).toBe('showcase');
    expect(result.merchant?.slug).toBe('swiggy');
    expect(result.amount).toBe(850);
    expect(result.cardsEvaluated).toBeGreaterThanOrEqual(3);
    expect(result.recommendedCard).not.toBeNull();
    expect(result.recommendedCard?.bankSlug).toBeTruthy();
    expect(result.recommendedCard?.cardSlug).toBeTruthy();
  });

  it('includes catalog cards outside the user portfolio on best-card', async ({ skip }) => {
    if (!fixtures) {
      skip();
      return;
    }
    const user = await createUser(`m018-catalog-${Date.now()}@cardwise.test`);
    await portfolio.addCard(user.id, { creditCardId: fixtures.premium.id });
    await portfolio.addCard(user.id, { creditCardId: fixtures.standard.id });

    const result = await recommendations.recommendBestCard(user.id, {
      amount: 1000,
      merchantSlug: 'swiggy',
      categorySlug: 'dining',
    });

    expect(result.catalogRecommendation).not.toBeNull();
    expect(result.catalogRecommendation!.cardsEvaluated).toBeGreaterThan(0);

    const catalogCardIds = [
      result.catalogRecommendation!.recommendedCard,
      ...result.catalogRecommendation!.alternatives,
    ]
      .filter(Boolean)
      .map((card) => card!.creditCardId);

    expect(catalogCardIds).not.toContain(fixtures.premium.id);
    expect(catalogCardIds).not.toContain(fixtures.standard.id);
  });
});
