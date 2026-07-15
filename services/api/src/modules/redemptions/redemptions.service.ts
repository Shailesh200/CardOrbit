import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import {
  DEFAULT_POINT_VALUE_INR,
  parseListRedemptionHistoryQuery,
  parseRecordRedemptionInput,
  parseValidateRedemptionInput,
  type RedemptionCatalogOverview,
  type RedemptionHistoryResponse,
  type RedemptionRecommendationsResponse,
  type RedemptionValidationResult,
  type RecordRedemptionInput,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RewardWalletService } from '../reward-wallet/reward-wallet.service';
import { estimateBalanceValueInr } from '../reward-wallet/reward-wallet-valuation';
import {
  buildCatalogForCard,
  buildRecommendations,
  computeRedemptionValue,
  pickBestValueOptionId,
  validateRedemption,
  type CardSnapshot,
} from './redemption-catalog';
import { mapRedemptionHistoryItem } from './redemptions.mapper';

@Injectable()
export class RedemptionsService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardWallet: RewardWalletService,
  ) {}

  async getCatalog(userId: string): Promise<RedemptionCatalogOverview> {
    await this.requireActiveUser(userId);
    const cards = await this.loadCardSnapshots(userId);
    const options = cards.flatMap((card) => buildCatalogForCard(card));

    options.sort((a, b) => b.estimatedValueInr - a.estimatedValueInr);

    const overview: RedemptionCatalogOverview = {
      optionCount: options.length,
      eligibleCount: options.filter((row) => row.eligible).length,
      bestValueOptionId: pickBestValueOptionId(options),
      options,
    };

    this.trackEvent(userId, AnalyticsEvent.REDEMPTIONS_VIEWED, {
      optionCount: overview.optionCount,
      eligibleCount: overview.eligibleCount,
    });

    return overview;
  }

  async getRecommendations(userId: string): Promise<RedemptionRecommendationsResponse> {
    await this.requireActiveUser(userId);
    const cards = await this.loadCardSnapshots(userId);
    const options = cards.flatMap((card) => buildCatalogForCard(card));
    const balances = cards.flatMap((card) =>
      card.balances.map((balance) => ({
        ...balance,
        userCardId: card.userCardId,
        cardName: card.cardName,
      })),
    );

    return buildRecommendations(options, balances);
  }

  async getHistory(userId: string, rawQuery: unknown): Promise<RedemptionHistoryResponse> {
    await this.requireActiveUser(userId);
    const query = parseListRedemptionHistoryQuery(rawQuery ?? {});

    const where = {
      userId,
      ...(query.userCardId ? { userCardId: query.userCardId } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.rewardRedemption.findMany({
        where,
        orderBy: { redeemedAt: 'desc' },
        skip,
        take: query.pageSize,
        include: {
          userCard: {
            include: {
              creditCard: { include: { bank: true } },
            },
          },
        },
      }),
      this.prisma.rewardRedemption.count({ where }),
    ]);

    return {
      items: rows.map((row) => mapRedemptionHistoryItem(row, row.userCard)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async validate(userId: string, rawInput: unknown): Promise<RedemptionValidationResult> {
    await this.requireActiveUser(userId);
    const input = parseValidateRedemptionInput(rawInput);
    const context = await this.loadRedemptionContext(userId, input.userCardId, input.balanceKind);

    const result = validateRedemption({
      availablePoints: context.availablePoints,
      balanceKind: input.balanceKind,
      pointValueInr: context.pointValueInr,
      optionType: input.optionType,
      pointsToRedeem: input.pointsToRedeem,
    });

    this.trackEvent(userId, AnalyticsEvent.REDEMPTION_VALIDATED, {
      eligible: result.eligible,
      optionType: input.optionType,
    });

    return result;
  }

  async record(userId: string, rawInput: unknown) {
    await this.requireActiveUser(userId);
    const input = parseRecordRedemptionInput(rawInput);

    const validation = await this.validate(userId, input);
    if (!validation.eligible) {
      throw new BadRequestException(validation.reason ?? 'Redemption is not eligible');
    }

    const context = await this.loadRedemptionContext(userId, input.userCardId, input.balanceKind);
    const value = computeRedemptionValue({
      points: input.pointsRedeemed,
      balanceKind: input.balanceKind,
      pointValueInr: context.pointValueInr,
      optionType: input.optionType,
    });

    const redeemedAt = input.redeemedAt ? new Date(input.redeemedAt) : new Date();

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rewardRedemption.create({
        data: {
          userId,
          userCardId: input.userCardId,
          balanceKind: input.balanceKind,
          optionType: input.optionType,
          pointsRedeemed: input.pointsRedeemed,
          estimatedValueInr: value.estimatedValueInr,
          effectiveRatePercent: value.effectiveRatePercent,
          status: 'COMPLETED',
          notes: input.notes ?? null,
          redeemedAt,
        },
        include: {
          userCard: {
            include: {
              creditCard: { include: { bank: true } },
            },
          },
        },
      });

      if (context.accountId && context.balanceId) {
        const nextAvailable = Math.max(0, context.availablePoints - input.pointsRedeemed);
        await tx.rewardBalance.update({
          where: { id: context.balanceId },
          data: {
            availableAmount: nextAvailable,
            estimatedValueInr: estimateBalanceValueInr(
              input.balanceKind,
              nextAvailable,
              context.pointValueInr,
            ),
          },
        });
        await tx.rewardAccount.update({
          where: { id: context.accountId },
          data: { lastSyncedAt: new Date() },
        });
      }

      return created;
    });

    this.trackEvent(userId, AnalyticsEvent.REDEMPTION_RECORDED, {
      optionType: input.optionType,
      pointsRedeemed: input.pointsRedeemed,
      estimatedValueInr: value.estimatedValueInr,
    });

    return mapRedemptionHistoryItem(record, record.userCard);
  }

  async getById(userId: string, redemptionId: string) {
    await this.requireActiveUser(userId);

    const row = await this.prisma.rewardRedemption.findFirst({
      where: { id: redemptionId, userId },
      include: {
        userCard: {
          include: {
            creditCard: { include: { bank: true } },
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Redemption not found');
    }

    return mapRedemptionHistoryItem(row, row.userCard);
  }

  private async loadCardSnapshots(userId: string): Promise<CardSnapshot[]> {
    await this.rewardWallet.getOverview(userId);

    const cards = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            rewardProgram: true,
          },
        },
        rewardAccount: {
          include: { balances: true },
        },
      },
    });

    return cards.map((card) => {
      const pointValueInr =
        card.creditCard.rewardProgram?.pointValueInr != null
          ? Number(card.creditCard.rewardProgram.pointValueInr)
          : DEFAULT_POINT_VALUE_INR;

      const balances =
        card.rewardAccount?.balances
          .filter((row) => Number(row.availableAmount) > 0)
          .map((row) => ({
            kind: row.kind,
            availableAmount: Number(row.availableAmount),
            expiringAmount: Number(row.expiringAmount),
            expiringAt: row.expiringAt,
          })) ?? [];

      return {
        userCardId: card.id,
        cardName: card.nickname ?? card.creditCard.name,
        bankName: card.creditCard.bank.name,
        pointValueInr,
        balances,
      };
    });
  }

  private async loadRedemptionContext(
    userId: string,
    userCardId: string,
    balanceKind: RecordRedemptionInput['balanceKind'],
  ) {
    const card = await this.prisma.userCard.findFirst({
      where: { id: userCardId, userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: { include: { rewardProgram: true } },
        rewardAccount: { include: { balances: true } },
      },
    });

    if (!card) {
      throw new NotFoundException('Portfolio card not found');
    }

    const pointValueInr =
      card.creditCard.rewardProgram?.pointValueInr != null
        ? Number(card.creditCard.rewardProgram.pointValueInr)
        : DEFAULT_POINT_VALUE_INR;

    const balance = card.rewardAccount?.balances.find((row) => row.kind === balanceKind);
    const availablePoints = balance ? Number(balance.availableAmount) : 0;

    return {
      pointValueInr,
      availablePoints,
      accountId: card.rewardAccount?.id ?? null,
      balanceId: balance?.id ?? null,
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
