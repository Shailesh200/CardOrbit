import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import type {
  AnnualFeeWaiverOverview,
  MilestoneForecastResponse,
  MilestoneTrackerOverview,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { mapRewardRuleSummary } from '../card-benefits/card-benefits.mapper';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../rewards/domain/repositories/reward-rule.repository';
import { daysRemainingInPeriod, estimateCompletionDate, periodBounds } from './milestone-period';
import {
  buildMilestoneLabel,
  computeProgress,
  extractSpendMilestones,
  parseFeeWaiverThreshold,
} from './milestone-progress';

@Injectable()
export class MilestonesService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository,
  ) {}

  async getSpendMilestones(userId: string): Promise<MilestoneTrackerOverview> {
    await this.requireActiveUser(userId);
    const today = new Date();
    const spendMilestones = await this.buildSpendMilestones(userId, today);

    spendMilestones.sort((a, b) => b.progressPercent - a.progressPercent);

    this.trackEvent(userId, AnalyticsEvent.MILESTONES_VIEWED, {
      count: spendMilestones.length,
      achievedCount: spendMilestones.filter((row) => row.status === 'ACHIEVED').length,
    });

    return {
      spendMilestones,
      achievedCount: spendMilestones.filter((row) => row.status === 'ACHIEVED').length,
      inProgressCount: spendMilestones.filter((row) => row.status === 'IN_PROGRESS').length,
    };
  }

  async getAnnualFeeWaiver(userId: string): Promise<AnnualFeeWaiverOverview> {
    await this.requireActiveUser(userId);
    const today = new Date();
    const bounds = periodBounds('annual', today);
    const cards = await this.loadCards(userId);
    const items = [];

    for (const card of cards) {
      const annualFee = card.creditCard.annualFeeInr ? Number(card.creditCard.annualFeeInr) : null;
      if (annualFee == null || annualFee <= 0) continue;

      const annualFeeRow = card.creditCard.fees.find((fee) => fee.feeType === 'ANNUAL');
      const parsed = parseFeeWaiverThreshold(annualFeeRow?.waiverConditions ?? null);
      const requiredSpendInr =
        parsed.requiredSpendInr ?? (await this.defaultWaiverThreshold(card.creditCard.id)) ?? null;
      if (requiredSpendInr == null) continue;

      const stats = await this.spendInPeriod(userId, card.id, bounds.start, today);
      const progress = computeProgress({
        currentSpendInr: stats.volumeInr,
        thresholdInr: requiredSpendInr,
      });

      items.push({
        userCardId: card.id,
        creditCardId: card.creditCardId,
        cardName: card.nickname ?? card.creditCard.name,
        bankName: card.creditCard.bank.name,
        annualFeeInr: annualFee,
        requiredSpendInr,
        currentSpendInr: stats.volumeInr,
        remainingSpendInr: progress.remainingSpendInr,
        progressPercent: progress.progressPercent,
        status: progress.status,
        periodLabel: bounds.label,
        periodStart: bounds.start.toISOString(),
        periodEnd: bounds.end.toISOString(),
        daysRemaining: daysRemainingInPeriod(bounds.end, today),
        waiverSummary: parsed.summary,
      });
    }

    items.sort((a, b) => b.progressPercent - a.progressPercent);

    this.trackEvent(userId, AnalyticsEvent.ANNUAL_FEE_WAIVER_VIEWED, {
      count: items.length,
      qualifiedCount: items.filter((row) => row.status === 'ACHIEVED').length,
    });

    return {
      items,
      qualifiedCount: items.filter((row) => row.status === 'ACHIEVED').length,
    };
  }

  async getForecast(userId: string): Promise<MilestoneForecastResponse> {
    await this.requireActiveUser(userId);
    const today = new Date();
    const spendMilestones = await this.buildSpendMilestones(userId, today);

    const forecasts = spendMilestones
      .filter((row) => row.status !== 'ACHIEVED')
      .map((row) => {
        const elapsedDays = Math.max(
          1,
          Math.round(
            (today.getTime() - new Date(row.periodStart).getTime()) / (24 * 60 * 60 * 1000),
          ) + 1,
        );
        const averageDailySpendInr = row.currentSpendInr / elapsedDays;
        const estimated = estimateCompletionDate({
          currentSpendInr: row.currentSpendInr,
          thresholdInr: row.spendThresholdInr,
          periodStart: new Date(row.periodStart),
          today,
        });

        const onTrack =
          estimated != null
            ? estimated.getTime() <= new Date(row.periodEnd).getTime()
            : row.progressPercent >= 50;

        return {
          milestoneId: row.id,
          userCardId: row.userCardId,
          cardName: row.cardName,
          label: row.label,
          estimatedCompletionDate: estimated?.toISOString() ?? null,
          onTrack,
          averageDailySpendInr: Math.round(averageDailySpendInr * 100) / 100,
        };
      });

    return { forecasts };
  }

  private async buildSpendMilestones(userId: string, today: Date) {
    const cards = await this.loadCards(userId);
    const spendMilestones = [];

    for (const card of cards) {
      const rules = await this.rewardRules.listActiveForCard(card.creditCardId);
      for (const view of rules) {
        const summary = mapRewardRuleSummary({
          id: view.activeVersion.id,
          ruleKey: view.rule.ruleKey,
          name: view.rule.name,
          spendCategoryCode: view.spendCategoryCode,
          payload: view.activeVersion.payload,
        });

        const candidates = extractSpendMilestones({
          ruleId: summary.id,
          ruleName: summary.name,
          payload: {
            rewardMultiplier: summary.rewardMultiplier ?? undefined,
            cashbackPercent: summary.cashbackPercent ?? undefined,
            spendThreshold: summary.spendThreshold ?? undefined,
            milestoneBonus: summary.milestoneBonus ?? undefined,
            milestoneMode: view.activeVersion.payload.milestoneMode,
            milestonePeriod: view.activeVersion.payload.milestonePeriod,
            exclusions: view.activeVersion.payload.exclusions ?? [],
          },
        });

        for (const candidate of candidates) {
          const bounds = periodBounds(candidate.period, today);
          const stats = await this.spendInPeriod(userId, card.id, bounds.start, today);
          const progress = computeProgress({
            currentSpendInr: stats.volumeInr,
            thresholdInr: candidate.spendThreshold,
          });

          spendMilestones.push({
            id: `${card.id}:${candidate.ruleId}:${candidate.period}`,
            userCardId: card.id,
            creditCardId: card.creditCardId,
            cardName: card.nickname ?? card.creditCard.name,
            bankName: card.creditCard.bank.name,
            ruleId: candidate.ruleId,
            ruleName: candidate.ruleName,
            label: buildMilestoneLabel(candidate),
            period: candidate.period,
            periodLabel: bounds.label,
            periodStart: bounds.start.toISOString(),
            periodEnd: bounds.end.toISOString(),
            spendThresholdInr: candidate.spendThreshold,
            currentSpendInr: stats.volumeInr,
            remainingSpendInr: progress.remainingSpendInr,
            progressPercent: progress.progressPercent,
            milestoneBonus: candidate.milestoneBonus,
            status: progress.status,
            transactionCount: stats.count,
            daysRemaining: daysRemainingInPeriod(bounds.end, today),
          });
        }
      }
    }

    return spendMilestones;
  }

  private async defaultWaiverThreshold(creditCardId: string): Promise<number | null> {
    const rules = await this.rewardRules.listActiveForCard(creditCardId);
    for (const view of rules) {
      const threshold = view.activeVersion.payload.spendThreshold;
      const mode = view.activeVersion.payload.milestoneMode ?? 'single_transaction';
      const period = view.activeVersion.payload.milestonePeriod ?? 'annual';
      if (threshold != null && threshold > 0 && mode === 'cumulative' && period === 'annual') {
        return threshold;
      }
    }
    return null;
  }

  private async spendInPeriod(
    userId: string,
    userCardId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        userId,
        userCardId,
        status: { in: ['POSTED', 'PENDING'] },
        transactedAt: { gte: periodStart, lte: periodEnd },
      },
      _count: { _all: true },
      _sum: { amountInr: true },
    });

    return {
      count: aggregate._count._all,
      volumeInr: Number(aggregate._sum.amountInr ?? 0),
    };
  }

  private async loadCards(userId: string) {
    return this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            fees: { where: { deletedAt: null } },
          },
        },
      },
    });
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
