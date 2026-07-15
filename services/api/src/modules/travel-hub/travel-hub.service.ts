import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import type {
  TravelHubOverview,
  TravelLoungeOverview,
  TravelMilesOverview,
  TravelSpendingSummary,
} from '@cardwise/validation';
import { OfferStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  filterBenefitsBySection,
  mapRewardRuleSummary,
} from '../card-benefits/card-benefits.mapper';
import { summarizeBenefits } from '../card-comparison/card-comparison-metrics';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../rewards/domain/repositories/reward-rule.repository';
import { RewardWalletService } from '../reward-wallet/reward-wallet.service';
import { estimateBalanceValueInr } from '../reward-wallet/reward-wallet-valuation';
import { enrichLoungeBenefits, summarizeLoungeBenefits } from './travel-hub-lounge';

const LOOKBACK_DAYS = 90;
const TRAVEL_CATEGORY = 'travel';
const TRAVEL_SPEND_CODES = new Set(['TRAVEL', 'AIR', 'HOTEL', 'FLIGHT']);

@Injectable()
export class TravelHubService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardWallet: RewardWalletService,
    @Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository,
  ) {}

  async getOverview(userId: string): Promise<TravelHubOverview> {
    await this.requireActiveUser(userId);
    const [cards, travelOffers, spending] = await Promise.all([
      this.buildCardProfiles(userId),
      this.loadTravelOffers(userId),
      this.buildTravelSpending(userId),
    ]);

    const loungeCardCount = cards.filter((card) => card.loungeBenefits.length > 0).length;
    const milesBalances = cards.flatMap((card) =>
      card.milesBalances.filter((row) => row.kind === 'MILES'),
    );
    const hotelBalances = cards.flatMap((card) =>
      card.milesBalances.filter((row) => row.kind === 'HOTEL_POINTS'),
    );
    const totalMiles = milesBalances.reduce((sum, row) => sum + row.availableAmount, 0);
    const totalHotelPoints = hotelBalances.reduce((sum, row) => sum + row.availableAmount, 0);
    const totalMilesValueInr = roundInr(
      [...milesBalances, ...hotelBalances].reduce(
        (sum, row) => sum + (row.estimatedValueInr ?? 0),
        0,
      ),
    );

    const bestTravelCardUserCardId = pickBestTravelCard(cards);

    const overview: TravelHubOverview = {
      cardCount: cards.length,
      loungeCardCount,
      totalMiles,
      totalHotelPoints,
      totalMilesValueInr,
      travelOfferCount: travelOffers.length,
      bestTravelCardUserCardId,
      cards,
      travelOffers,
      spending,
    };

    this.trackEvent(userId, AnalyticsEvent.TRAVEL_HUB_VIEWED, {
      cardCount: overview.cardCount,
      loungeCardCount: overview.loungeCardCount,
      totalMiles: overview.totalMiles,
    });

    return overview;
  }

  async getLoungeOverview(userId: string): Promise<TravelLoungeOverview> {
    await this.requireActiveUser(userId);
    const cards = await this.buildCardProfiles(userId);
    const loungeCards = cards.filter((card) => card.loungeBenefits.length > 0);

    return {
      cards: loungeCards,
      totalLoungePrograms: loungeCards.reduce((sum, card) => sum + card.loungeBenefits.length, 0),
    };
  }

  async getMilesOverview(userId: string): Promise<TravelMilesOverview> {
    await this.requireActiveUser(userId);
    const cards = await this.buildCardProfiles(userId);
    const balances = cards.flatMap((card) => card.milesBalances);

    const totalMiles = balances
      .filter((row) => row.kind === 'MILES')
      .reduce((sum, row) => sum + row.availableAmount, 0);
    const totalHotelPoints = balances
      .filter((row) => row.kind === 'HOTEL_POINTS')
      .reduce((sum, row) => sum + row.availableAmount, 0);
    const totalEstimatedValueInr = roundInr(
      balances.reduce((sum, row) => sum + (row.estimatedValueInr ?? 0), 0),
    );

    return {
      totalMiles,
      totalHotelPoints,
      totalEstimatedValueInr,
      balances,
    };
  }

  async getTravelSpending(userId: string): Promise<TravelSpendingSummary> {
    await this.requireActiveUser(userId);
    return this.buildTravelSpending(userId);
  }

  private async buildCardProfiles(userId: string) {
    await this.rewardWallet.getOverview(userId);

    const rows = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
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
          },
        },
        rewardAccount: { include: { balances: true } },
      },
    });

    const profiles = await Promise.all(
      rows.map(async (row) => {
        const card = row.creditCard;
        const cardSourceUrl = card.sourceUrl ?? null;
        const benefits = card.benefits;
        const loungeItems = enrichLoungeBenefits(
          filterBenefitsBySection(benefits, cardSourceUrl, 'LOUNGE'),
        );
        const travelBenefits = filterBenefitsBySection(benefits, cardSourceUrl, 'TRAVEL');
        const travelInsurance = filterBenefitsBySection(benefits, cardSourceUrl, 'INSURANCE');

        const pointValueInr =
          card.rewardProgram?.pointValueInr != null
            ? Number(card.rewardProgram.pointValueInr)
            : null;

        const milesBalances =
          row.rewardAccount?.balances
            .filter((balance) => balance.kind === 'MILES' || balance.kind === 'HOTEL_POINTS')
            .filter((balance) => Number(balance.availableAmount) > 0)
            .map((balance) => {
              const availableAmount = Number(balance.availableAmount);
              return {
                userCardId: row.id,
                cardName: row.nickname ?? card.name,
                bankName: card.bank.name,
                kind: balance.kind,
                availableAmount,
                estimatedValueInr:
                  balance.estimatedValueInr != null
                    ? Number(balance.estimatedValueInr)
                    : estimateBalanceValueInr(balance.kind, availableAmount, pointValueInr),
                expiringAmount: Number(balance.expiringAmount),
                expiringAt: balance.expiringAt?.toISOString() ?? null,
              };
            }) ?? [];

        const activeRules = await this.rewardRules.listActiveForCard(card.id);
        const travelRewardRules = activeRules
          .map((view) =>
            mapRewardRuleSummary({
              id: view.activeVersion.id,
              ruleKey: view.rule.ruleKey,
              name: view.rule.name,
              spendCategoryCode: view.spendCategoryCode,
              payload: view.activeVersion.payload,
            }),
          )
          .filter(
            (rule) =>
              rule.spendCategoryCode != null &&
              TRAVEL_SPEND_CODES.has(rule.spendCategoryCode.toUpperCase()),
          )
          .map((rule) => ({
            id: rule.id,
            name: rule.name,
            rewardMultiplier: rule.rewardMultiplier,
            cashbackPercent: rule.cashbackPercent,
            spendCategoryCode: rule.spendCategoryCode,
          }));

        return {
          userCardId: row.id,
          creditCardId: card.id,
          cardName: row.nickname ?? card.name,
          bankName: card.bank.name,
          networkName: card.network.name,
          tier: card.tier,
          loungeSummary: summarizeLoungeBenefits(loungeItems),
          travelSummary: summarizeBenefits(travelBenefits),
          loungeBenefits: loungeItems,
          travelBenefits,
          travelInsurance,
          milesBalances,
          travelRewardRules,
        };
      }),
    );

    return profiles;
  }

  private async loadTravelOffers(userId: string) {
    const cards = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      select: {
        id: true,
        nickname: true,
        creditCardId: true,
        creditCard: { select: { name: true } },
      },
    });

    if (cards.length === 0) return [];

    const asOf = new Date();
    const creditCardIds = cards.map((row) => row.creditCardId);
    const cardNameByCreditCardId = new Map(
      cards.map((row) => [row.creditCardId, row.nickname ?? row.creditCard.name]),
    );

    const offers = await this.prisma.offer.findMany({
      where: {
        deletedAt: null,
        status: OfferStatus.ACTIVE,
        validFrom: { lte: asOf },
        AND: [
          { OR: [{ validUntil: null }, { validUntil: { gte: asOf } }] },
          {
            cardAssignments: {
              some: {
                creditCardId: { in: creditCardIds },
                deletedAt: null,
              },
            },
          },
          {
            OR: [
              { title: { contains: 'travel', mode: 'insensitive' } },
              { title: { contains: 'flight', mode: 'insensitive' } },
              { title: { contains: 'hotel', mode: 'insensitive' } },
              { title: { contains: 'lounge', mode: 'insensitive' } },
              { description: { contains: 'travel', mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: {
        cardAssignments: {
          where: { creditCardId: { in: creditCardIds }, deletedAt: null },
          take: 1,
        },
      },
      orderBy: [{ validUntil: 'asc' }, { title: 'asc' }],
      take: 12,
    });

    return offers.map((offer) => ({
      id: offer.id,
      slug: offer.slug,
      title: offer.title,
      description: offer.description,
      cardName:
        cardNameByCreditCardId.get(offer.cardAssignments[0]?.creditCardId ?? '') ??
        'Portfolio card',
      validUntil: offer.validUntil?.toISOString() ?? null,
    }));
  }

  private async buildTravelSpending(userId: string): Promise<TravelSpendingSummary> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS);

    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        categorySlug: TRAVEL_CATEGORY,
        status: { not: 'FAILED' },
        transactedAt: { gte: since },
      },
      select: {
        amountInr: true,
        merchantName: true,
      },
    });

    const merchantMap = new Map<string, { volumeInr: number; count: number }>();
    let totalVolumeInr = 0;

    for (const row of rows) {
      const amount = Math.abs(Number(row.amountInr));
      totalVolumeInr += amount;
      const bucket = merchantMap.get(row.merchantName) ?? { volumeInr: 0, count: 0 };
      bucket.volumeInr += amount;
      bucket.count += 1;
      merchantMap.set(row.merchantName, bucket);
    }

    const topMerchants = [...merchantMap.entries()]
      .map(([merchantName, stats]) => ({
        merchantName,
        volumeInr: roundInr(stats.volumeInr),
        count: stats.count,
      }))
      .sort((a, b) => b.volumeInr - a.volumeInr)
      .slice(0, 5);

    return {
      totalVolumeInr: roundInr(totalVolumeInr),
      transactionCount: rows.length,
      periodLabel: `Last ${LOOKBACK_DAYS} days`,
      topMerchants,
    };
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

function pickBestTravelCard(
  cards: Array<{
    userCardId: string;
    loungeBenefits: unknown[];
    milesBalances: Array<{ estimatedValueInr: number | null }>;
    travelRewardRules: Array<{ rewardMultiplier: number | null }>;
  }>,
): string | null {
  if (cards.length === 0) return null;

  const scored = cards.map((card) => {
    let score = 0;
    score += card.loungeBenefits.length * 10;
    score += card.milesBalances.reduce((sum, row) => sum + (row.estimatedValueInr ?? 0), 0) / 100;
    const maxMultiplier = Math.max(
      0,
      ...card.travelRewardRules.map((r) => r.rewardMultiplier ?? 0),
    );
    score += maxMultiplier * 5;
    return { userCardId: card.userCardId, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best && best.score > 0 ? best.userCardId : null;
}

function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}
