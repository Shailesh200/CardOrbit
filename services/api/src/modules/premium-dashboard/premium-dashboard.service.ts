import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import type { PremiumDashboardOverview } from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { filterBenefitsBySection } from '../card-benefits/card-benefits.mapper';
import { MilestonesService } from '../milestones/milestones.service';
import { RewardWalletService } from '../reward-wallet/reward-wallet.service';
import {
  buildPremiumCardRoi,
  buildPremiumDashboardOverview,
  isPremiumCard,
  roundInr,
} from './premium-dashboard-engine';

const LOOKBACK_DAYS = 90;

@Injectable()
export class PremiumDashboardService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardWallet: RewardWalletService,
    private readonly milestones: MilestonesService,
  ) {}

  async getOverview(userId: string): Promise<PremiumDashboardOverview> {
    await this.requireActiveUser(userId);

    const [wallet, spendMilestones, feeWaivers, cardRows, spendByCard] = await Promise.all([
      this.rewardWallet.getOverview(userId),
      this.milestones.getSpendMilestones(userId),
      this.milestones.getAnnualFeeWaiver(userId),
      this.loadPortfolioCards(userId),
      this.loadSpendByCard(userId),
    ]);

    const walletByUserCardId = new Map(
      wallet.cards.map((card) => [card.userCardId, card.totalEstimatedValueInr]),
    );
    const feeWaiverByUserCardId = new Map(
      feeWaivers.items.map((item) => [item.userCardId, item.progressPercent]),
    );

    const milestoneBonusByUserCardId = new Map<string, number>();
    for (const milestone of spendMilestones.spendMilestones) {
      if (milestone.status === 'ACHIEVED' || milestone.milestoneBonus == null) continue;
      const current = milestoneBonusByUserCardId.get(milestone.userCardId) ?? 0;
      milestoneBonusByUserCardId.set(
        milestone.userCardId,
        current + Number(milestone.milestoneBonus),
      );
    }

    const premiumCards = cardRows.filter((row) => isPremiumCard(row.tier, row.annualFeeInr));

    const roiCards = premiumCards.map((row) =>
      buildPremiumCardRoi({
        userCardId: row.userCardId,
        creditCardId: row.creditCardId,
        cardName: row.cardName,
        bankName: row.bankName,
        tier: row.tier,
        annualFeeInr: row.annualFeeInr,
        walletValueInr: walletByUserCardId.get(row.userCardId) ?? 0,
        spendVolumeInr: spendByCard.get(row.userCardId) ?? 0,
        benefitCounts: row.benefitCounts,
        milestoneBonusPotentialInr: milestoneBonusByUserCardId.get(row.userCardId) ?? 0,
        feeWaiverProgressPercent: feeWaiverByUserCardId.get(row.userCardId) ?? null,
      }),
    );

    roiCards.sort((a, b) => b.netRoiInr - a.netRoiInr);

    const aggregates = buildPremiumDashboardOverview({
      cards: roiCards,
      periodLabel: `Last ${LOOKBACK_DAYS} days spend · annual fee & benefits estimate`,
    });

    const overview: PremiumDashboardOverview = {
      ...aggregates,
      cards: roiCards,
      periodLabel: `Last ${LOOKBACK_DAYS} days spend · annual fee & benefits estimate`,
    };

    this.trackEvent(userId, AnalyticsEvent.PREMIUM_DASHBOARD_VIEWED, {
      premiumCardCount: overview.premiumCardCount,
      portfolioNetRoiInr: overview.portfolioNetRoiInr,
      totalAnnualFeesInr: overview.totalAnnualFeesInr,
    });

    return overview;
  }

  private async loadPortfolioCards(userId: string) {
    const rows = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            benefits: {
              where: { deletedAt: null },
              include: { benefitType: true },
            },
          },
        },
      },
    });

    return rows.map((row) => {
      const card = row.creditCard;
      const cardSourceUrl = card.sourceUrl ?? null;
      const benefits = card.benefits;

      return {
        userCardId: row.id,
        creditCardId: card.id,
        cardName: row.nickname ?? card.name,
        bankName: card.bank.name,
        tier: card.tier,
        annualFeeInr: card.annualFeeInr != null ? Number(card.annualFeeInr) : null,
        benefitCounts: {
          lounge: filterBenefitsBySection(benefits, cardSourceUrl, 'LOUNGE').length,
          insurance: filterBenefitsBySection(benefits, cardSourceUrl, 'INSURANCE').length,
          travel: filterBenefitsBySection(benefits, cardSourceUrl, 'TRAVEL').length,
          fuel: filterBenefitsBySection(benefits, cardSourceUrl, 'FUEL').length,
          dining: filterBenefitsBySection(benefits, cardSourceUrl, 'DINING').length,
          emi: filterBenefitsBySection(benefits, cardSourceUrl, 'EMI').length,
        },
      };
    });
  }

  private async loadSpendByCard(userId: string): Promise<Map<string, number>> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS);

    const rows = await this.prisma.transaction.groupBy({
      by: ['userCardId'],
      where: {
        userId,
        transactedAt: { gte: since },
        status: { not: 'FAILED' },
      },
      _sum: { amountInr: true },
    });

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.userCardId, roundInr(Math.abs(Number(row._sum.amountInr ?? 0))));
    }
    return map;
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
