import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { CardBenefitsDashboard } from '@cardwise/validation';
import { OfferStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../rewards/domain/repositories/reward-rule.repository';
import { estimateBalanceValueInr, isExpiringSoon } from '../reward-wallet/reward-wallet-valuation';
import {
  buildAnnualFeeSummary,
  buildMilestonePreviews,
  filterBenefitsBySection,
  groupBenefitSections,
  mapRewardRuleSummary,
} from './card-benefits.mapper';

@Injectable()
export class CardBenefitsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository,
  ) {}

  async getDashboard(userId: string, userCardId: string): Promise<CardBenefitsDashboard> {
    await this.requireActiveUser(userId);

    const row = await this.prisma.userCard.findFirst({
      where: { id: userCardId, userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            network: true,
            rewardProgram: true,
            benefits: {
              where: { deletedAt: null },
              orderBy: { title: 'asc' },
              include: { benefitType: true },
            },
            fees: { where: { deletedAt: null } },
          },
        },
        rewardAccount: { include: { balances: true } },
      },
    });

    if (!row) throw new NotFoundException('Card not found in portfolio');

    const card = row.creditCard;
    const cardSourceUrl = card.sourceUrl ?? null;
    const benefits = card.benefits;
    const benefitSections = groupBenefitSections(benefits, cardSourceUrl);
    const loungeAccess = filterBenefitsBySection(benefits, cardSourceUrl, 'LOUNGE');
    const insurance = filterBenefitsBySection(benefits, cardSourceUrl, 'INSURANCE');
    const feeBenefits = filterBenefitsBySection(benefits, cardSourceUrl, 'FEES');

    const activeRules = await this.rewardRules.listActiveForCard(card.id);
    const rewardRules = activeRules.map((view) =>
      mapRewardRuleSummary({
        id: view.activeVersion.id,
        ruleKey: view.rule.ruleKey,
        name: view.rule.name,
        spendCategoryCode: view.spendCategoryCode,
        payload: view.activeVersion.payload,
      }),
    );

    const offers = await this.loadCardOffers(card.id);
    const recommendationHistory = await this.loadRecommendationHistory(userId, userCardId, card.id);

    const wallet = this.buildWalletSnapshot(row.rewardAccount, card.rewardProgram?.pointValueInr);

    return {
      overview: {
        userCardId: row.id,
        creditCardId: card.id,
        cardName: card.name,
        nickname: row.nickname,
        bankName: card.bank.name,
        bankSlug: card.bank.slug,
        cardSlug: card.slug,
        networkName: card.network.name,
        tier: card.tier,
        status: row.status,
        isFavorite: row.isFavorite,
        sourceUrl: cardSourceUrl,
        statementDay: row.statementDay,
        dueDay: row.dueDay,
        rewardProgramName: card.rewardProgram?.name ?? null,
        pointValueInr:
          card.rewardProgram?.pointValueInr != null
            ? Number(card.rewardProgram.pointValueInr)
            : null,
        benefitCount: benefits.length,
        wallet,
      },
      benefitSections,
      rewardRules,
      milestones: buildMilestonePreviews(rewardRules),
      offers,
      loungeAccess,
      insurance,
      annualFee: buildAnnualFeeSummary({
        annualFeeInr: card.annualFeeInr != null ? Number(card.annualFeeInr) : null,
        joiningFeeInr: card.joiningFeeInr != null ? Number(card.joiningFeeInr) : null,
        fees: card.fees.map((fee) => ({
          id: fee.id,
          feeType: fee.feeType,
          amountInr: Number(fee.amountInr),
          waiverConditions: fee.waiverConditions,
        })),
        feeBenefits,
      }),
      recommendationHistory,
    };
  }

  private buildWalletSnapshot(
    account: {
      lastSyncedAt: Date | null;
      balances: Array<{
        kind: string;
        availableAmount: { toString(): string };
        expiringAmount: { toString(): string };
        expiringAt: Date | null;
        estimatedValueInr: { toString(): string } | null;
      }>;
    } | null,
    pointValueInr: { toString(): string } | null | undefined,
  ) {
    if (!account) return null;

    const rate = pointValueInr != null ? Number(pointValueInr) : null;
    let totalEstimatedValueInr = 0;
    let expiringSoonCount = 0;

    for (const balance of account.balances) {
      const availableAmount = Number(balance.availableAmount);
      const estimated =
        balance.estimatedValueInr != null
          ? Number(balance.estimatedValueInr)
          : estimateBalanceValueInr(
              balance.kind as 'POINTS' | 'CASHBACK' | 'MILES' | 'HOTEL_POINTS',
              availableAmount,
              rate,
            );
      totalEstimatedValueInr += estimated;

      if (
        Number(balance.expiringAmount) > 0 &&
        balance.expiringAt &&
        isExpiringSoon(balance.expiringAt)
      ) {
        expiringSoonCount += 1;
      }
    }

    return {
      totalEstimatedValueInr: Math.round(totalEstimatedValueInr * 100) / 100,
      expiringSoonCount,
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    };
  }

  private async loadCardOffers(creditCardId: string) {
    const asOf = new Date();
    const rows = await this.prisma.offer.findMany({
      where: {
        deletedAt: null,
        status: OfferStatus.ACTIVE,
        validFrom: { lte: asOf },
        OR: [{ validUntil: null }, { validUntil: { gte: asOf } }],
        cardAssignments: {
          some: {
            creditCardId,
            deletedAt: null,
          },
        },
      },
      orderBy: [{ validUntil: 'asc' }, { title: 'asc' }],
      take: 12,
    });

    return rows.map((offer) => ({
      id: offer.id,
      slug: offer.slug,
      title: offer.title,
      description: offer.description,
      cashbackPercent: offer.cashbackPercent != null ? Number(offer.cashbackPercent) : null,
      validUntil: offer.validUntil?.toISOString() ?? null,
      status: offer.status,
    }));
  }

  private async loadRecommendationHistory(
    userId: string,
    userCardId: string,
    creditCardId: string,
  ) {
    const rows = await this.prisma.recommendationHistory.findMany({
      where: {
        userId,
        OR: [{ recommendedUserCardId: userCardId }, { recommendedCreditCardId: creditCardId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return rows.map((row) => ({
      id: row.id,
      merchantName: row.merchantName,
      amountInr: Number(row.amountInr),
      expectedRewardInr: row.expectedRewardInr != null ? Number(row.expectedRewardInr) : null,
      createdAt: row.createdAt.toISOString(),
      wasRecommended: row.recommendedUserCardId === userCardId,
    }));
  }

  private async requireActiveUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
  }
}
