import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import {
  parseRewardPersonalizationProfile,
  type SpendingInsightsOverview,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { mapRewardRuleSummary } from '../card-benefits/card-benefits.mapper';
import { parseAnswersFromUser } from '../onboarding/onboarding.mapper';
import { calculateReward } from '../rewards/domain/services/reward-calculator';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../rewards/domain/repositories/reward-rule.repository';
import {
  blendCategoryBreakdowns,
  buildCategoryBreakdownFromHistory,
  buildCategoryBreakdownFromProfile,
  buildSpendingInsights,
  buildTopMerchants,
  categoryLabel,
  computeOptimizationOpportunity,
  estimateMonthlySpendFromBand,
  historySinceDate,
  type HistoryRow,
} from './spending-insights-analytics';

const OPPORTUNITY_SAMPLE_AMOUNT_INR = 10_000;

@Injectable()
export class SpendingInsightsService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository,
  ) {}

  async getOverview(userId: string): Promise<SpendingInsightsOverview> {
    const user = await this.requireActiveUser(userId);
    const since = historySinceDate();

    const [historyRows, transactionRows, userCards] = await Promise.all([
      this.prisma.recommendationHistory.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        select: {
          amountInr: true,
          categorySlug: true,
          merchantSlug: true,
          merchantName: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: { userId, transactedAt: { gte: since }, status: { not: 'FAILED' } },
        orderBy: { transactedAt: 'desc' },
        select: {
          amountInr: true,
          categorySlug: true,
          merchantSlug: true,
          merchantName: true,
        },
      }),
      this.prisma.userCard.findMany({
        where: { userId, status: { not: 'REMOVED' } },
        include: {
          creditCard: {
            include: { rewardProgram: true },
          },
        },
      }),
    ]);

    const personalization = parseRewardPersonalizationProfile(user.personalizationProfile);
    const onboarding = parseAnswersFromUser(user);
    const spendBand = personalization.spendBand ?? onboarding.spendBand ?? null;
    const categorySlugs =
      personalization.preferredCategorySlugs.length > 0
        ? personalization.preferredCategorySlugs
        : (onboarding.categories ?? []);

    const estimatedMonthlySpendInr = estimateMonthlySpendFromBand(spendBand);

    const historyInput: HistoryRow[] = historyRows.map((row) => ({
      amountInr: Number(row.amountInr),
      categorySlug: row.categorySlug,
      merchantSlug: row.merchantSlug,
      merchantName: row.merchantName,
    }));

    const transactionInput: HistoryRow[] = transactionRows.map((row) => ({
      amountInr: Number(row.amountInr),
      categorySlug: row.categorySlug,
      merchantSlug: row.merchantSlug,
      merchantName: row.merchantName,
    }));

    await this.enrichMerchantNames([...historyInput, ...transactionInput]);

    const transactionBreakdown = buildCategoryBreakdownFromHistory(transactionInput);
    const historyBreakdown = buildCategoryBreakdownFromHistory(historyInput);
    const profileBreakdown = buildCategoryBreakdownFromProfile({
      categorySlugs,
      estimatedMonthlySpendInr,
    });

    let dataSource: SpendingInsightsOverview['dataSource'];
    let categories;
    let activityInput: HistoryRow[];
    let activityCount: number;

    if (transactionBreakdown.length > 0) {
      dataSource = 'transactions';
      categories = transactionBreakdown;
      activityInput = transactionInput;
      activityCount = transactionRows.length;
    } else if (historyBreakdown.length === 0) {
      dataSource = 'onboarding_profile';
      categories = profileBreakdown;
      activityInput = historyInput;
      activityCount = 0;
    } else if (profileBreakdown.length === 0 || categorySlugs.length === 0) {
      dataSource = 'recommendation_history';
      categories = historyBreakdown;
      activityInput = historyInput;
      activityCount = historyRows.length;
    } else {
      dataSource = 'blended';
      categories = blendCategoryBreakdowns(historyBreakdown, profileBreakdown);
      activityInput = historyInput;
      activityCount = historyRows.length;
    }

    const totalVolumeInr = categories.reduce((sum, row) => sum + row.volumeInr, 0);
    const topCategorySlug = categories[0]?.slug ?? null;
    const topMerchants = buildTopMerchants(activityInput);

    const monthlyCategorySpendInr =
      topCategorySlug && categories[0]
        ? estimatedMonthlySpendInr != null
          ? (estimatedMonthlySpendInr * categories[0].sharePercent) / 100
          : categories[0].volumeInr / 3
        : 0;

    const opportunity =
      topCategorySlug && userCards.length > 0
        ? await this.buildOpportunity(userCards, topCategorySlug, monthlyCategorySpendInr)
        : null;

    const insights = buildSpendingInsights({
      categories,
      topMerchants,
      inquiryCount: activityCount,
      totalVolumeInr,
      dataSource,
      opportunity,
    });

    const overview: SpendingInsightsOverview = {
      totalVolumeInr: Math.round(totalVolumeInr * 100) / 100,
      inquiryCount: activityCount,
      periodLabel: 'Last 90 days',
      dataSource,
      categories,
      topMerchants,
      insights,
      topCategorySlug,
      estimatedMonthlySpendInr,
    };

    this.trackViewed(userId, overview);
    return overview;
  }

  private async buildOpportunity(
    userCards: Array<{
      creditCardId: string;
      nickname: string | null;
      creditCard: {
        name: string;
        rewardProgram: { pointValueInr: unknown } | null;
      };
    }>,
    categorySlug: string,
    monthlyCategorySpendInr: number,
  ) {
    const cardRates = await Promise.all(
      userCards.map(async (row) => {
        const rules = await this.rewardRules.listActiveForCard(row.creditCardId);
        const summaries = rules.map((view) =>
          mapRewardRuleSummary({
            id: view.activeVersion.id,
            ruleKey: view.rule.ruleKey,
            name: view.rule.name,
            spendCategoryCode: view.spendCategoryCode,
            payload: view.activeVersion.payload,
          }),
        );

        const matching = summaries.filter(
          (rule) =>
            rule.spendCategoryCode?.toLowerCase() === categorySlug.toLowerCase() ||
            (rule.spendCategoryCode == null && summaries.length === 1),
        );

        const candidates = matching.length > 0 ? matching : summaries;
        const pointValueInr = row.creditCard.rewardProgram?.pointValueInr
          ? Number(row.creditCard.rewardProgram.pointValueInr)
          : 0.25;

        let bestRate = 0;
        for (const rule of candidates) {
          const calculated = calculateReward({
            amountInr: OPPORTUNITY_SAMPLE_AMOUNT_INR,
            payload: {
              rewardMultiplier: rule.rewardMultiplier ?? undefined,
              cashbackPercent: rule.cashbackPercent ?? undefined,
              exclusions: [],
            },
            pointValueInr,
            exclusionTags: [],
            at: new Date(),
          });
          if (calculated && calculated.effectiveRatePercent > bestRate) {
            bestRate = calculated.effectiveRatePercent;
          }
        }

        return {
          cardName: row.nickname ?? row.creditCard.name,
          ratePercent: bestRate,
        };
      }),
    );

    return computeOptimizationOpportunity({
      categorySlug,
      monthlyCategorySpendInr,
      cards: cardRates.filter((row) => row.ratePercent > 0),
    });
  }

  private trackViewed(userId: string, overview: SpendingInsightsOverview): void {
    if (!this.analyticsReady) {
      initAnalytics({
        useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
      });
      this.analyticsReady = true;
    }

    trackEvent(
      AnalyticsEvent.SPENDING_INSIGHTS_VIEWED,
      {
        dataSource: overview.dataSource,
        inquiryCount: overview.inquiryCount,
        topCategorySlug: overview.topCategorySlug ?? undefined,
        categoryCount: overview.categories.length,
      },
      { distinctId: userId },
    );
  }

  private async enrichMerchantNames(rows: HistoryRow[]): Promise<void> {
    const missingSlugs = [
      ...new Set(
        rows
          .filter((row) => !row.merchantName?.trim() && row.merchantSlug)
          .map((row) => row.merchantSlug as string),
      ),
    ];
    if (missingSlugs.length === 0) return;

    const catalog = await this.prisma.merchant.findMany({
      where: { slug: { in: missingSlugs }, deletedAt: null },
      select: { slug: true, name: true },
    });
    const nameBySlug = new Map(catalog.map((row) => [row.slug, row.name]));

    for (const row of rows) {
      if (!row.merchantName?.trim() && row.merchantSlug) {
        row.merchantName = nameBySlug.get(row.merchantSlug) ?? null;
      }
    }
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }
}

export { categoryLabel };
