import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import { parseCompareCardsInput, type CardComparisonResult } from '@cardwise/validation';
import { OfferStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../rewards/domain/repositories/reward-rule.repository';
import { estimateBalanceValueInr } from '../reward-wallet/reward-wallet-valuation';
import {
  buildMilestonePreviews,
  filterBenefitsBySection,
  mapRewardRuleSummary,
} from '../card-benefits/card-benefits.mapper';
import {
  buildComparisonColumns,
  buildComparisonRows,
  extractForexMarkup,
  maxFromRules,
  pickRecommendedCard,
  summarizeBenefits,
  type CardComparisonSnapshot,
} from './card-comparison-metrics';

@Injectable()
export class CardComparisonService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository,
  ) {}

  async compare(userId: string, raw: unknown): Promise<CardComparisonResult> {
    await this.requireActiveUser(userId);

    let input;
    try {
      input = parseCompareCardsInput(raw);
    } catch {
      throw new BadRequestException('Provide 2–4 portfolio or catalog card IDs to compare');
    }

    if (input.creditCardIds?.length) {
      return this.compareCatalogCards(userId, input.creditCardIds);
    }

    const uniqueIds = [...new Set(input.userCardIds ?? [])];
    if (uniqueIds.length !== (input.userCardIds?.length ?? 0)) {
      throw new BadRequestException('Duplicate cards in comparison');
    }

    const rows = await this.prisma.userCard.findMany({
      where: { userId, id: { in: uniqueIds }, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            rewardProgram: true,
            benefits: {
              where: { deletedAt: null },
              include: { benefitType: true },
            },
          },
        },
        rewardAccount: { include: { balances: true } },
      },
    });

    if (rows.length !== uniqueIds.length) {
      throw new NotFoundException('One or more portfolio cards were not found');
    }

    const ordered = uniqueIds
      .map((id) => rows.find((row) => row.id === id))
      .filter((row): row is (typeof rows)[number] => row != null);

    const snapshots = await Promise.all(ordered.map((row) => this.buildSnapshot(row)));

    this.trackCompared(userId, snapshots);

    return {
      columns: buildComparisonColumns(snapshots),
      rows: buildComparisonRows(snapshots),
      recommendedUserCardId: pickRecommendedCard(snapshots),
    };
  }

  private async compareCatalogCards(
    userId: string,
    creditCardIds: string[],
  ): Promise<CardComparisonResult> {
    const uniqueIds = [...new Set(creditCardIds)];
    if (uniqueIds.length !== creditCardIds.length) {
      throw new BadRequestException('Duplicate cards in comparison');
    }

    const cards = await this.prisma.creditCard.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null, active: true },
      include: {
        bank: true,
        rewardProgram: true,
        benefits: {
          where: { deletedAt: null },
          include: { benefitType: true },
        },
      },
    });

    if (cards.length !== uniqueIds.length) {
      throw new NotFoundException('One or more catalog cards were not found');
    }

    const ordered = uniqueIds
      .map((id) => cards.find((card) => card.id === id))
      .filter((card): card is (typeof cards)[number] => card != null);

    const snapshots = await Promise.all(
      ordered.map((card) =>
        this.buildSnapshot({
          id: `catalog:${card.id}`,
          nickname: null,
          isFavorite: false,
          creditCard: card,
          rewardAccount: null,
        }),
      ),
    );

    this.trackCompared(userId, snapshots);

    return {
      columns: buildComparisonColumns(snapshots),
      rows: buildComparisonRows(snapshots),
      recommendedUserCardId: pickRecommendedCard(snapshots),
    };
  }

  private async buildSnapshot(row: {
    id: string;
    nickname: string | null;
    isFavorite: boolean;
    creditCard: {
      id: string;
      name: string;
      slug: string;
      tier: string;
      annualFeeInr: { toString(): string } | null;
      joiningFeeInr: { toString(): string } | null;
      sourceUrl: string | null;
      bank: { name: string; slug: string };
      rewardProgram: { pointValueInr: { toString(): string } | null } | null;
      benefits: Array<{
        id: string;
        title: string;
        description: string | null;
        sourceUrl: string | null;
        benefitType: { code: string; name: string };
      }>;
    };
    rewardAccount: {
      balances: Array<{
        kind: string;
        availableAmount: { toString(): string };
        estimatedValueInr: { toString(): string } | null;
      }>;
    } | null;
  }): Promise<CardComparisonSnapshot> {
    const card = row.creditCard;
    const cardSourceUrl = card.sourceUrl ?? null;
    const benefits = card.benefits;

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

    const offerCount = await this.prisma.offer.count({
      where: {
        deletedAt: null,
        status: OfferStatus.ACTIVE,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        cardAssignments: { some: { creditCardId: card.id, deletedAt: null } },
      },
    });

    const feeBenefits = filterBenefitsBySection(benefits, cardSourceUrl, 'FEES');
    const pointValueInr =
      card.rewardProgram?.pointValueInr != null ? Number(card.rewardProgram.pointValueInr) : null;

    return {
      userCardId: row.id,
      creditCardId: card.id,
      cardName: card.name,
      nickname: row.nickname,
      bankName: card.bank.name,
      bankSlug: card.bank.slug,
      cardSlug: card.slug,
      tier: card.tier,
      isFavorite: row.isFavorite,
      annualFeeInr: card.annualFeeInr != null ? Number(card.annualFeeInr) : null,
      joiningFeeInr: card.joiningFeeInr != null ? Number(card.joiningFeeInr) : null,
      maxRewardMultiplier: maxFromRules(rewardRules, 'rewardMultiplier'),
      maxCashbackPercent: maxFromRules(rewardRules, 'cashbackPercent'),
      pointValueInr,
      loungeSummary: summarizeBenefits(filterBenefitsBySection(benefits, cardSourceUrl, 'LOUNGE')),
      insuranceSummary: summarizeBenefits(
        filterBenefitsBySection(benefits, cardSourceUrl, 'INSURANCE'),
      ),
      fuelSummary: summarizeBenefits(filterBenefitsBySection(benefits, cardSourceUrl, 'FUEL')),
      travelSummary: summarizeBenefits(filterBenefitsBySection(benefits, cardSourceUrl, 'TRAVEL')),
      welcomeSummary: summarizeBenefits(
        filterBenefitsBySection(benefits, cardSourceUrl, 'WELCOME'),
      ),
      forexMarkupSummary: extractForexMarkup(feeBenefits),
      milestoneCount: buildMilestonePreviews(rewardRules).length,
      offerCount,
      benefitCount: benefits.length,
      walletValueInr: this.sumWalletValue(row.rewardAccount, pointValueInr),
    };
  }

  private sumWalletValue(
    account: {
      balances: Array<{
        kind: string;
        availableAmount: { toString(): string };
        estimatedValueInr: { toString(): string } | null;
      }>;
    } | null,
    pointValueInr: number | null,
  ): number | null {
    if (!account || account.balances.length === 0) return null;

    const total = account.balances.reduce((sum, balance) => {
      const availableAmount = Number(balance.availableAmount);
      const estimated =
        balance.estimatedValueInr != null
          ? Number(balance.estimatedValueInr)
          : estimateBalanceValueInr(
              balance.kind as 'POINTS' | 'CASHBACK' | 'MILES' | 'HOTEL_POINTS',
              availableAmount,
              pointValueInr,
            );
      return sum + estimated;
    }, 0);

    return total > 0 ? Math.round(total * 100) / 100 : null;
  }

  private trackCompared(userId: string, snapshots: CardComparisonSnapshot[]): void {
    if (!this.analyticsReady) {
      initAnalytics({
        useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
      });
      this.analyticsReady = true;
    }

    trackEvent(
      AnalyticsEvent.CARD_COMPARED,
      { cardIds: snapshots.map((card) => card.creditCardId) },
      { distinctId: userId },
    );
  }

  private async requireActiveUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
  }
}
