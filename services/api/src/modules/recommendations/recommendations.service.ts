import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  initAnalytics,
  trackCardDataGap,
  trackRecommendationRequested,
  trackRecommendationViewed,
} from '@cardwise/analytics';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  parseAdminRecommendationAuditInput,
  parseBestCardRecommendationInput,
  parseRewardPersonalizationProfile,
  toRecommendationPreferenceOverrides,
  type AdminRecommendationAuditInput,
  type BestCardRecommendationInput,
  type RecommendationStrategicCardSignal,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { RankingSignalsService } from './ranking-signals.service';
import { RecommendationHistoryService } from './recommendation-history.service';
import { StrategicSignalsService } from './domain/services/strategic-signals.service';
import { FindMerchantByAliasQuery } from '../merchants/application/queries/find-by-alias.query';
import {
  REWARD_RULE_EVALUATOR,
  type RewardRuleEvaluator,
} from '../rewards/domain/ports/reward-rule-evaluator.port';
import {
  buildRecommendationSummary,
  rankCardRecommendations,
  type CardEvaluationCandidate,
  type RankedCardRecommendation,
  type RecommendationAuditEntry,
} from './domain/services/recommendation-ranker';
import {
  enrichRecommendationExplanation,
  isAiExplanationEnabled,
  buildCalculationBreakdown,
  buildRecommendationCitations,
  type RecommendationCalculationBreakdown,
  type RecommendationCitation,
} from './domain/services/recommendation-explanation';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';

/** Public home hero compares up to four active catalog cards (no hardcoded slugs). */
const SHOWCASE_CARD_LIMIT = 4;
const CATALOG_CARD_LIMIT = 12;

const SHOWCASE_SCENARIO = {
  amount: 850,
  merchantSlug: 'swiggy',
  categorySlug: 'dining',
} as const;

export type MerchantContext = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  spendCategoryId: string | null;
  popularityScore: number;
};

export type BestCardRecommendationResult = {
  recommendationId: string;
  amount: number;
  merchant: MerchantContext | null;
  spendCategoryId: string | null;
  recommendedCard: RankedCardRecommendation | null;
  alternatives: RankedCardRecommendation[];
  explanation: string;
  explanationSource: 'ai' | 'template';
  shortSummary?: string;
  bulletReasons?: string[];
  calculationBreakdown: RecommendationCalculationBreakdown | null;
  citations: RecommendationCitation[];
  aiModel?: string;
  cardsEvaluated: number;
  rankingVersion: 'v1' | 'v2' | 'v3';
  catalogRecommendation: CatalogRecommendationSlice | null;
};

export type CatalogRecommendationSlice = {
  recommendedCard: RankedCardRecommendation | null;
  alternatives: RankedCardRecommendation[];
  explanation: string;
  explanationSource: 'ai' | 'template';
  shortSummary?: string;
  bulletReasons?: string[];
  calculationBreakdown: RecommendationCalculationBreakdown | null;
  citations: RecommendationCitation[];
  cardsEvaluated: number;
};

export type RecommendationAuditResult = BestCardRecommendationResult & {
  userId: string;
  audit: RecommendationAuditEntry[];
};

@Injectable()
export class RecommendationsService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REWARD_RULE_EVALUATOR) private readonly rewardEvaluator: RewardRuleEvaluator,
    private readonly findMerchantByAlias: FindMerchantByAliasQuery,
    private readonly featureFlags: FeatureFlagsService,
    private readonly rankingSignals: RankingSignalsService,
    private readonly recommendationHistory: RecommendationHistoryService,
    private readonly strategicSignals: StrategicSignalsService,
  ) {}

  private ensureAnalytics(): void {
    if (this.analyticsReady) return;
    initAnalytics({
      useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
    });
    this.analyticsReady = true;
  }

  private async ensureRecommendationEnabled(userId: string): Promise<'v1' | 'v2' | 'v3'> {
    if (!(await this.featureFlags.isEnabled(FeatureFlag.RECOMMENDATION_V1, userId))) {
      throw new NotFoundException('Recommendations are not available');
    }
    if (await this.featureFlags.isEnabled(FeatureFlag.RECOMMENDATION_V3, userId)) {
      return 'v3';
    }
    return (await this.featureFlags.isEnabled(FeatureFlag.RECOMMENDATION_V2, userId)) ? 'v2' : 'v1';
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  async recommendBestCard(userId: string, raw: unknown): Promise<BestCardRecommendationResult> {
    const rankingVersion = await this.ensureRecommendationEnabled(userId);
    await this.requireActiveUser(userId);

    let input: BestCardRecommendationInput;
    try {
      input = parseBestCardRecommendationInput(raw);
    } catch {
      throw new BadRequestException('Invalid recommendation payload');
    }

    const result = await this.buildRecommendation(userId, input, rankingVersion);
    const enriched = await this.applyExplanationEnrichment(result, input, userId);
    const catalogRecommendation = await this.buildCatalogRecommendation(
      userId,
      input,
      rankingVersion,
    );
    this.ensureAnalytics();

    trackRecommendationRequested(
      {
        merchantId: enriched.merchant?.id,
        merchantName: enriched.merchant?.name,
        amount: enriched.amount,
        availableCardIds: [enriched.recommendedCard, ...enriched.alternatives]
          .map((row) => row?.creditCardId)
          .filter(Boolean) as string[],
      },
      { distinctId: userId },
    );

    if (enriched.recommendedCard) {
      trackRecommendationViewed(
        {
          merchantId: enriched.merchant?.id,
          merchantName: enriched.merchant?.name,
          amount: enriched.amount,
          recommendedCardId: enriched.recommendedCard.creditCardId,
          expectedReward: enriched.recommendedCard.expectedRewardInr,
          rankingVersion,
          confidenceScore: enriched.recommendedCard.confidenceScore,
        },
        { distinctId: userId },
      );
    }

    await this.recommendationHistory
      .persistRecommendation(userId, input, enriched)
      .catch(() => undefined);

    return { ...enriched, catalogRecommendation };
  }

  async recommendShowcase(): Promise<BestCardRecommendationResult & { source: 'showcase' }> {
    const rankingVersion = await this.ensureRecommendationEnabled('showcase');

    const input: BestCardRecommendationInput = {
      amount: SHOWCASE_SCENARIO.amount,
      merchantSlug: SHOWCASE_SCENARIO.merchantSlug,
      categorySlug: SHOWCASE_SCENARIO.categorySlug,
    };

    const showcaseCards = await this.prisma.creditCard.findMany({
      where: { deletedAt: null, active: true },
      orderBy: [{ bank: { slug: 'asc' } }, { slug: 'asc' }],
      take: SHOWCASE_CARD_LIMIT,
      select: { slug: true },
    });

    if (showcaseCards.length === 0) {
      throw new NotFoundException('Showcase cards not available');
    }

    const result = await this.buildRecommendationFromCatalog(
      showcaseCards.map((card) => card.slug),
      input,
      rankingVersion,
    );

    return {
      ...(await this.applyExplanationEnrichment(result, input, 'showcase')),
      source: 'showcase',
    };
  }

  async auditRecommendation(raw: unknown): Promise<RecommendationAuditResult> {
    let input: AdminRecommendationAuditInput;
    try {
      input = parseAdminRecommendationAuditInput(raw);
    } catch {
      throw new BadRequestException('Invalid recommendation audit payload');
    }

    const rankingVersion = await this.ensureRecommendationEnabled(input.userId);
    const { userId, ...request } = input;
    const result = await this.buildRecommendation(userId, request, rankingVersion);

    return {
      ...(await this.applyExplanationEnrichment(result, request, userId)),
      userId,
      audit: result.audit,
    };
  }

  private async buildRecommendation(
    userId: string,
    input: BestCardRecommendationInput,
    rankingVersion: 'v1' | 'v2' | 'v3',
  ): Promise<BestCardRecommendationResult & { audit: RecommendationAuditEntry[] }> {
    const at = input.at ? new Date(input.at) : new Date();
    const merchant = await this.resolveMerchant(input);
    const spendCategoryId = await this.resolveSpendCategoryId(input, merchant);

    const portfolio = await this.prisma.userCard.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        creditCard: {
          include: { bank: true },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { addedAt: 'asc' }],
    });

    if (portfolio.length === 0) {
      throw new BadRequestException(
        'Add at least one card to your portfolio to get recommendations',
      );
    }

    const candidates = await this.evaluateCandidates(
      portfolio.map((row) => ({
        userCardId: row.id,
        creditCardId: row.creditCardId,
        cardName: row.creditCard.name,
        bankName: row.creditCard.bank.name,
        bankSlug: row.creditCard.bank.slug,
        cardSlug: row.creditCard.slug,
        isFavorite: row.isFavorite,
      })),
      {
        userId,
        amount: input.amount,
        merchantId: merchant?.id,
        merchantName: merchant?.name,
        spendCategoryId,
        exclusionTags: input.exclusionTags,
        periodSpendInr: input.periodSpendInr,
        periodRewardsEarnedInr: input.periodRewardsEarnedInr,
        at,
      },
    );

    const personalizedInput = await this.applyStoredPersonalization(userId, input, rankingVersion);

    const portfolioBankSlugs = [...new Set(portfolio.map((row) => row.creditCard.bank.slug))];
    const profile = parseRewardPersonalizationProfile(
      (
        await this.prisma.user.findUnique({
          where: { id: userId },
          select: { personalizationProfile: true },
        })
      )?.personalizationProfile,
    );

    const signals = await this.rankingSignals.enrichPreferences({
      userId,
      basePreferences: personalizedInput.preferences ?? {},
      portfolioBankSlugs,
      favoriteCount: portfolio.filter((row) => row.isFavorite).length,
      portfolioCount: portfolio.length,
      profile: {
        preferredRewardType: profile.preferredRewardType,
        preferredBankSlugs: profile.preferredBankSlugs,
        preferredCategorySlugs: profile.preferredCategorySlugs,
        boostFavoriteCards: profile.boostFavoriteCards,
      },
      request: {
        merchantSlug: input.merchantSlug ?? merchant?.slug,
        categorySlug: input.categorySlug ?? 'general',
        amountInr: input.amount,
      },
    });

    const strategic =
      rankingVersion === 'v3'
        ? await this.strategicSignals.loadSignals({
            userId,
            userCardIds: portfolio.map((row) => row.id),
            creditCardIds: portfolio.map((row) => row.creditCardId),
            categorySlug: input.categorySlug ?? null,
          })
        : null;

    return this.finalizeRecommendation(
      candidates,
      { ...personalizedInput, preferences: signals.preferences },
      merchant,
      spendCategoryId,
      rankingVersion,
      signals.aiPreferenceWeight,
      strategic ?? undefined,
    );
  }

  /** Ranks active catalog cards the user has not added to their portfolio. */
  private async buildCatalogRecommendation(
    userId: string,
    input: BestCardRecommendationInput,
    rankingVersion: 'v1' | 'v2' | 'v3',
  ): Promise<CatalogRecommendationSlice | null> {
    const owned = await this.prisma.userCard.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { creditCardId: true },
    });
    const ownedIds = owned.map((row) => row.creditCardId);

    const catalogCards = await this.prisma.creditCard.findMany({
      where: {
        deletedAt: null,
        active: true,
        ...(ownedIds.length > 0 ? { id: { notIn: ownedIds } } : {}),
      },
      orderBy: [{ bank: { slug: 'asc' } }, { slug: 'asc' }],
      take: CATALOG_CARD_LIMIT,
      select: { slug: true },
    });

    if (catalogCards.length === 0) {
      return null;
    }

    const ranked = await this.buildRecommendationFromCatalog(
      catalogCards.map((card) => card.slug),
      input,
      rankingVersion,
    );

    const enriched = await this.applyExplanationEnrichment(ranked, input, userId);

    return {
      recommendedCard: enriched.recommendedCard,
      alternatives: enriched.alternatives,
      explanation: enriched.explanation,
      explanationSource: enriched.explanationSource,
      shortSummary: enriched.shortSummary,
      bulletReasons: enriched.bulletReasons,
      calculationBreakdown: enriched.calculationBreakdown,
      citations: enriched.citations,
      cardsEvaluated: enriched.cardsEvaluated,
    };
  }

  private async buildRecommendationFromCatalog(
    cardSlugs: string[],
    input: BestCardRecommendationInput,
    rankingVersion: 'v1' | 'v2' | 'v3',
  ): Promise<BestCardRecommendationResult & { audit: RecommendationAuditEntry[] }> {
    const at = input.at ? new Date(input.at) : new Date();
    const merchant = await this.resolveMerchant(input);
    const spendCategoryId = await this.resolveSpendCategoryId(input, merchant);

    const catalogCards = await this.prisma.creditCard.findMany({
      where: { slug: { in: cardSlugs }, deletedAt: null, active: true },
      include: { bank: true },
    });

    const orderedCards = cardSlugs
      .map((slug) => catalogCards.find((card) => card.slug === slug))
      .filter((card): card is (typeof catalogCards)[number] => Boolean(card));

    if (orderedCards.length === 0) {
      throw new NotFoundException('Showcase cards not available');
    }

    const candidates = await this.evaluateCandidates(
      orderedCards.map((card) => ({
        userCardId: `showcase-${card.slug}`,
        creditCardId: card.id,
        cardName: card.name,
        bankName: card.bank.name,
        bankSlug: card.bank.slug,
        cardSlug: card.slug,
      })),
      {
        userId: 'showcase',
        amount: input.amount,
        merchantId: merchant?.id,
        merchantName: merchant?.name,
        spendCategoryId,
        exclusionTags: input.exclusionTags,
        periodSpendInr: input.periodSpendInr,
        periodRewardsEarnedInr: input.periodRewardsEarnedInr,
        at,
      },
    );

    return this.finalizeRecommendation(
      candidates,
      input,
      merchant,
      spendCategoryId,
      rankingVersion,
    );
  }

  private async evaluateCandidates(
    stubs: Omit<CardEvaluationCandidate, 'evaluation'>[],
    ctx: {
      userId: string;
      amount: number;
      merchantId?: string;
      merchantName?: string;
      spendCategoryId: string | null;
      exclusionTags?: string[];
      periodSpendInr?: number;
      periodRewardsEarnedInr?: number;
      at: Date;
    },
  ): Promise<CardEvaluationCandidate[]> {
    const candidates: CardEvaluationCandidate[] = [];
    const benefitCounts = await this.prisma.cardBenefit.groupBy({
      by: ['creditCardId'],
      where: {
        creditCardId: { in: stubs.map((stub) => stub.creditCardId) },
        deletedAt: null,
      },
      _count: { _all: true },
    });
    const benefitsByCard = new Map(benefitCounts.map((row) => [row.creditCardId, row._count._all]));

    for (const stub of stubs) {
      const evaluation = await this.rewardEvaluator.evaluate({
        creditCardId: stub.creditCardId,
        amountInr: ctx.amount,
        merchantId: ctx.merchantId,
        spendCategoryId: ctx.spendCategoryId,
        exclusionTags: ctx.exclusionTags,
        periodSpendInr: ctx.periodSpendInr,
        periodRewardsEarnedInr: ctx.periodRewardsEarnedInr,
        at: ctx.at,
      });

      if (!evaluation) {
        this.ensureAnalytics();
        trackCardDataGap(
          {
            gapType: 'missing_reward_rule',
            cardId: stub.creditCardId,
            cardSlug: stub.cardSlug,
            cardName: stub.cardName,
            merchantId: ctx.merchantId,
            merchantName: ctx.merchantName,
            spendCategoryId: ctx.spendCategoryId,
            source: 'recommendation',
          },
          { distinctId: ctx.userId },
        );
      }

      if ((benefitsByCard.get(stub.creditCardId) ?? 0) === 0) {
        this.ensureAnalytics();
        trackCardDataGap(
          {
            gapType: 'missing_benefit_data',
            cardId: stub.creditCardId,
            cardSlug: stub.cardSlug,
            cardName: stub.cardName,
            merchantId: ctx.merchantId,
            merchantName: ctx.merchantName,
            spendCategoryId: ctx.spendCategoryId,
            source: 'recommendation',
          },
          { distinctId: ctx.userId },
        );
      }

      candidates.push({ ...stub, evaluation });
    }

    return candidates;
  }

  private async applyStoredPersonalization(
    userId: string,
    input: BestCardRecommendationInput,
    rankingVersion: 'v1' | 'v2' | 'v3',
  ): Promise<BestCardRecommendationInput> {
    if ((rankingVersion !== 'v2' && rankingVersion !== 'v3') || userId === 'showcase') {
      return input;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { personalizationProfile: true },
    });
    if (!user) {
      return input;
    }

    const fromProfile = toRecommendationPreferenceOverrides(
      parseRewardPersonalizationProfile(user.personalizationProfile),
    );

    return {
      ...input,
      preferences: { ...fromProfile, ...input.preferences },
    };
  }

  private finalizeRecommendation(
    candidates: CardEvaluationCandidate[],
    input: BestCardRecommendationInput,
    merchant: MerchantContext | null,
    spendCategoryId: string | null,
    rankingVersion: 'v1' | 'v2' | 'v3',
    aiPreferenceWeight = 0,
    strategic?: {
      isTravelCategory: boolean;
      signalsByUserCardId: Record<string, RecommendationStrategicCardSignal>;
    },
  ): BestCardRecommendationResult & { audit: RecommendationAuditEntry[] } {
    const useContextual = rankingVersion === 'v2' || rankingVersion === 'v3';
    const { ranked, audit } = rankCardRecommendations(candidates, {
      engineVersion: rankingVersion,
      rankingContext: useContextual
        ? {
            amountInr: input.amount,
            merchantPopularityScore: merchant?.popularityScore,
            preferences: input.preferences,
            aiPreferenceWeight,
            isTravelCategory: strategic?.isTravelCategory,
            strategicSignalsByUserCardId: strategic?.signalsByUserCardId,
          }
        : undefined,
    });
    const recommendedCard = ranked[0] ?? null;
    const alternatives = ranked.slice(1);

    return {
      recommendationId: newUuidV7(),
      amount: input.amount,
      merchant,
      spendCategoryId,
      recommendedCard,
      alternatives,
      explanation: buildRecommendationSummary(ranked, merchant?.name, rankingVersion),
      explanationSource: 'template',
      calculationBreakdown: recommendedCard
        ? buildCalculationBreakdown(recommendedCard, input.amount, rankingVersion)
        : null,
      citations: recommendedCard ? buildRecommendationCitations(recommendedCard) : [],
      cardsEvaluated: candidates.length,
      rankingVersion,
      catalogRecommendation: null,
      audit,
    };
  }

  private async applyExplanationEnrichment(
    result: BestCardRecommendationResult & { audit: RecommendationAuditEntry[] },
    input: BestCardRecommendationInput,
    distinctId: string,
  ): Promise<BestCardRecommendationResult> {
    const ranked = [result.recommendedCard, ...result.alternatives].filter(
      (row): row is RankedCardRecommendation => row != null,
    );

    if (ranked.length === 0) {
      const { audit: _audit, ...rest } = result;
      return rest;
    }

    const aiEnabled = await isAiExplanationEnabled(distinctId);
    const envelope = await enrichRecommendationExplanation({
      ranked,
      audit: result.audit,
      amountInr: result.amount,
      merchantName: result.merchant?.name,
      merchantSlug: result.merchant?.slug ?? input.merchantSlug,
      categorySlug: input.categorySlug,
      rankingVersion: result.rankingVersion,
      aiEnabled,
    });

    const { audit: _audit, ...rest } = result;
    if (!envelope) return rest;

    return {
      ...rest,
      explanation: envelope.explanation,
      explanationSource: envelope.explanationSource,
      shortSummary: envelope.shortSummary,
      bulletReasons: envelope.bulletReasons,
      calculationBreakdown: envelope.calculationBreakdown,
      citations: envelope.citations,
      aiModel: envelope.aiModel,
    };
  }

  private async resolveMerchant(
    input: BestCardRecommendationInput,
  ): Promise<MerchantContext | null> {
    if (input.merchantId) {
      const row = await this.prisma.merchant.findFirst({
        where: { id: input.merchantId, deletedAt: null, active: true },
      });
      if (!row) throw new NotFoundException('Merchant not found');
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        logoUrl: row.logoUrl,
        spendCategoryId: row.primaryCategoryId,
        popularityScore: row.popularityScore,
      };
    }

    if (input.merchantSlug) {
      const row = await this.prisma.merchant.findFirst({
        where: { slug: input.merchantSlug, deletedAt: null, active: true },
      });
      if (!row) throw new NotFoundException('Merchant not found');
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        logoUrl: row.logoUrl,
        spendCategoryId: row.primaryCategoryId,
        popularityScore: row.popularityScore,
      };
    }

    if (input.merchantAlias) {
      const aliasMatch = await this.findMerchantByAlias.execute(input.merchantAlias);
      if (!aliasMatch) throw new NotFoundException('Merchant alias not found');
      const row = await this.prisma.merchant.findFirst({
        where: { id: aliasMatch.merchantId, deletedAt: null, active: true },
      });
      if (!row) throw new NotFoundException('Merchant not found');
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        logoUrl: row.logoUrl,
        spendCategoryId: row.primaryCategoryId,
        popularityScore: row.popularityScore,
      };
    }

    return null;
  }

  private async resolveSpendCategoryId(
    input: BestCardRecommendationInput,
    merchant: MerchantContext | null,
  ): Promise<string | null> {
    if (input.spendCategoryId) {
      return input.spendCategoryId;
    }

    if (input.categorySlug) {
      const category = await this.prisma.spendCategory.findFirst({
        where: {
          deletedAt: null,
          OR: [{ slug: input.categorySlug }, { code: input.categorySlug.toUpperCase() }],
        },
      });
      if (!category) throw new NotFoundException('Spend category not found');
      return category.id;
    }

    return merchant?.spendCategoryId ?? null;
  }
}
