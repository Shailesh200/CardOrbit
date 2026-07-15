import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import {
  parseListCashbackHistoryQuery,
  parseRewardRulePayload,
  type CashbackAttribution,
  type CashbackCategoriesResponse,
  type CashbackDashboard,
  type CashbackForecast,
  type CashbackHistoryResponse,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { tagsForSpendCategory } from '../rewards/domain/services/exclusion-tags';
import {
  REWARD_RULE_EVALUATOR,
  type RewardRuleEvaluator,
} from '../rewards/domain/ports/reward-rule-evaluator.port';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../rewards/domain/repositories/reward-rule.repository';
import { categoryLabel } from '../transactions/transactions.mapper';
import { periodBounds } from '../milestones/milestone-period';
import {
  buildCashbackDashboard,
  buildCashbackForecast,
  buildCategoryBreakdown,
  mapTransactionLedgerStatus,
  paginateHistory,
  roundInr,
  type CashbackLedgerEntry,
} from './cashback-aggregation';

const LOOKBACK_DAYS = 90;

@Injectable()
export class CashbackService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REWARD_RULE_EVALUATOR) private readonly rewardEvaluator: RewardRuleEvaluator,
    @Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository,
  ) {}

  async getDashboard(userId: string): Promise<CashbackDashboard> {
    await this.requireActiveUser(userId);
    const { entries, transactionCount, eligibleTransactionCount } = await this.buildLedger(userId);
    const walletCashbackInr = await this.loadWalletCashbackInr(userId);

    const dashboard = buildCashbackDashboard(
      entries,
      walletCashbackInr,
      `Last ${LOOKBACK_DAYS} days`,
      transactionCount,
      eligibleTransactionCount,
    );

    this.trackEvent(userId, AnalyticsEvent.CASHBACK_VIEWED, {
      totalEarnedInr: dashboard.totalEarnedInr,
      creditedCashbackInr: dashboard.creditedCashbackInr,
      pendingCashbackInr: dashboard.pendingCashbackInr,
    });

    return dashboard;
  }

  async getHistory(userId: string, rawQuery: unknown): Promise<CashbackHistoryResponse> {
    await this.requireActiveUser(userId);
    const query = parseListCashbackHistoryQuery(rawQuery ?? {});
    const { entries } = await this.buildLedger(userId);

    const page = paginateHistory(entries, query.page, query.pageSize, {
      userCardId: query.userCardId,
      ledgerStatus: query.ledgerStatus,
    });

    this.trackEvent(userId, AnalyticsEvent.CASHBACK_HISTORY_VIEWED, {
      count: page.total,
      page: page.page,
    });

    return page;
  }

  async getCategories(userId: string): Promise<CashbackCategoriesResponse> {
    await this.requireActiveUser(userId);
    const { entries } = await this.buildLedger(userId);

    return {
      categories: buildCategoryBreakdown(entries),
      periodLabel: `Last ${LOOKBACK_DAYS} days`,
    };
  }

  async getForecast(userId: string): Promise<CashbackForecast> {
    await this.requireActiveUser(userId);
    const { entries } = await this.buildLedger(userId);
    return buildCashbackForecast(entries);
  }

  async getTransactionAttribution(
    userId: string,
    transactionId: string,
  ): Promise<CashbackAttribution> {
    await this.requireActiveUser(userId);

    const row = await this.prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        userCard: {
          include: {
            creditCard: {
              include: { bank: true, rewardProgram: true },
            },
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Transaction not found');
    }

    const categoryIdBySlug = await this.loadCategoryIdBySlug();
    const spendCategoryId = categoryIdBySlug.get(row.categorySlug.toLowerCase()) ?? null;
    const exclusionTags = tagsForSpendCategory(null, row.categorySlug);
    const ledgerStatus = mapTransactionLedgerStatus(row.status);

    if (row.status === 'FAILED' || ledgerStatus == null) {
      return {
        transactionId: row.id,
        eligible: false,
        cashbackInr: 0,
        cashbackPercent: null,
        ruleName: null,
        ruleKey: null,
        ledgerStatus: null,
        explanation: 'Failed transactions are not eligible for cashback.',
        excluded: true,
        exclusionReason: 'Transaction failed',
      };
    }

    const hasCashbackRules = await this.cardHasCashbackRules(row.userCard.creditCardId);
    if (!hasCashbackRules) {
      return {
        transactionId: row.id,
        eligible: false,
        cashbackInr: 0,
        cashbackPercent: null,
        ruleName: null,
        ruleKey: null,
        ledgerStatus,
        explanation: 'No cashback rules configured for this card.',
        excluded: false,
        exclusionReason: null,
      };
    }

    const { periodSpendInr, periodRewardsEarnedInr } = await this.periodContextForTransaction(
      userId,
      row.userCardId,
      row.transactedAt,
      row.id,
    );

    const evaluation = await this.rewardEvaluator.evaluate({
      creditCardId: row.userCard.creditCardId,
      amountInr: Number(row.amountInr),
      merchantId: row.merchantId,
      spendCategoryId,
      exclusionTags,
      periodSpendInr,
      periodRewardsEarnedInr,
      at: row.transactedAt,
    });

    if (!evaluation || evaluation.cashbackInr === 0) {
      return {
        transactionId: row.id,
        eligible: Boolean(evaluation && !evaluation.excluded),
        cashbackInr: 0,
        cashbackPercent: evaluation?.cashbackPercent ?? null,
        ruleName: evaluation?.ruleName ?? null,
        ruleKey: evaluation?.ruleKey ?? null,
        ledgerStatus,
        explanation: evaluation?.explanation ?? 'No cashback earned for this transaction.',
        excluded: evaluation?.excluded ?? false,
        exclusionReason: evaluation?.exclusionReason ?? null,
      };
    }

    return {
      transactionId: row.id,
      eligible: true,
      cashbackInr: evaluation.cashbackInr,
      cashbackPercent: evaluation.cashbackPercent ?? null,
      ruleName: evaluation.ruleName,
      ruleKey: evaluation.ruleKey,
      ledgerStatus,
      explanation: evaluation.explanation,
      excluded: false,
      exclusionReason: null,
    };
  }

  private async buildLedger(userId: string) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS);

    const [transactions, categoryIdBySlug, cardsWithCashback] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          transactedAt: { gte: since },
          status: { not: 'FAILED' },
        },
        orderBy: { transactedAt: 'asc' },
        include: {
          userCard: {
            include: {
              creditCard: {
                include: { bank: true, rewardProgram: true },
              },
            },
          },
        },
      }),
      this.loadCategoryIdBySlug(),
      this.loadCashbackCapableCardIds(userId),
    ]);

    const periodSpend = new Map<string, number>();
    const periodRewards = new Map<string, number>();
    const entries: CashbackLedgerEntry[] = [];
    let eligibleTransactionCount = 0;

    for (const row of transactions) {
      if (!cardsWithCashback.has(row.userCard.creditCardId)) {
        continue;
      }

      eligibleTransactionCount += 1;
      const ledgerStatus = mapTransactionLedgerStatus(row.status);
      if (!ledgerStatus) continue;

      const spendCategoryId = categoryIdBySlug.get(row.categorySlug.toLowerCase()) ?? null;
      const exclusionTags = tagsForSpendCategory(null, row.categorySlug);
      const monthBounds = periodBounds('monthly', row.transactedAt);
      const spendKey = `${row.userCardId}:${monthBounds.start.toISOString()}`;
      const rewardKey = `${row.userCardId}:${monthBounds.start.toISOString()}`;

      const periodSpendInr = periodSpend.get(spendKey) ?? 0;
      const periodRewardsEarnedInr = periodRewards.get(rewardKey) ?? 0;

      const evaluation = await this.rewardEvaluator.evaluate({
        creditCardId: row.userCard.creditCardId,
        amountInr: Number(row.amountInr),
        merchantId: row.merchantId,
        spendCategoryId,
        exclusionTags,
        periodSpendInr,
        periodRewardsEarnedInr,
        at: row.transactedAt,
      });

      periodSpend.set(spendKey, periodSpendInr + Math.abs(Number(row.amountInr)));

      if (evaluation?.cashbackInr) {
        periodRewards.set(rewardKey, periodRewardsEarnedInr + evaluation.cashbackInr);
      }

      if (!evaluation || evaluation.cashbackInr === 0) {
        continue;
      }

      entries.push({
        id: `${row.id}:cashback`,
        transactionId: row.id,
        userCardId: row.userCardId,
        cardName: row.userCard.nickname ?? row.userCard.creditCard.name,
        bankName: row.userCard.creditCard.bank.name,
        merchantName: row.merchantName,
        categorySlug: row.categorySlug,
        categoryLabel: categoryLabel(row.categorySlug),
        amountInr: Number(row.amountInr),
        cashbackInr: evaluation.cashbackInr,
        cashbackPercent: evaluation.cashbackPercent ?? null,
        ruleName: evaluation.ruleName,
        ledgerStatus,
        transactedAt: row.transactedAt.toISOString(),
      });
    }

    return {
      entries,
      transactionCount: transactions.length,
      eligibleTransactionCount,
    };
  }

  private async periodContextForTransaction(
    userId: string,
    userCardId: string,
    transactedAt: Date,
    transactionId: string,
  ) {
    const monthBounds = periodBounds('monthly', transactedAt);

    const priorRows = await this.prisma.transaction.findMany({
      where: {
        userId,
        userCardId,
        status: { not: 'FAILED' },
        transactedAt: { gte: monthBounds.start, lt: transactedAt },
        id: { not: transactionId },
      },
      select: { amountInr: true },
    });

    const periodSpendInr = priorRows.reduce((sum, row) => sum + Math.abs(Number(row.amountInr)), 0);

    return { periodSpendInr, periodRewardsEarnedInr: 0 };
  }

  private async loadCategoryIdBySlug() {
    const categories = await this.prisma.merchantCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true, code: true },
    });

    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.slug.toLowerCase(), category.id);
      map.set(category.code.toLowerCase(), category.id);
    }
    return map;
  }

  private async loadCashbackCapableCardIds(userId: string) {
    const cards = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      select: { creditCardId: true },
    });

    const capable = new Set<string>();
    await Promise.all(
      cards.map(async (card) => {
        if (await this.cardHasCashbackRules(card.creditCardId)) {
          capable.add(card.creditCardId);
        }
      }),
    );
    return capable;
  }

  private async cardHasCashbackRules(creditCardId: string): Promise<boolean> {
    const rules = await this.rewardRules.listActiveForCard(creditCardId);
    return rules.some((view) => {
      const payload = parseRewardRulePayload(view.activeVersion.payload);
      return payload.cashbackPercent != null;
    });
  }

  private async loadWalletCashbackInr(userId: string): Promise<number | null> {
    const accounts = await this.prisma.rewardAccount.findMany({
      where: { userId },
      include: { balances: true },
    });

    if (accounts.length === 0) return null;

    return roundInr(
      accounts
        .flatMap((account) => account.balances)
        .filter((balance) => balance.kind === 'CASHBACK')
        .reduce((sum, balance) => sum + Number(balance.availableAmount), 0),
    );
  }

  private trackEvent(
    userId: string,
    event: (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent],
    properties: Record<string, unknown>,
  ): void {
    if (!this.analyticsReady) {
      initAnalytics({
        useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
      });
      this.analyticsReady = true;
    }
    trackEvent(event, properties as never, { distinctId: userId });
  }

  private async requireActiveUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
  }
}
