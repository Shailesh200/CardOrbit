import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  type RewardBalanceKind,
  type RewardBalanceLine,
  type RewardWalletCardSummary,
  type RewardWalletExpiringItem,
  type RewardWalletOverview,
  type UpsertRewardWalletInput,
} from '@cardwise/validation';
import type { Prisma, RewardBalance } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';
import { RewardExpiryService } from '../reward-expiry/reward-expiry.service';
import { estimateBalanceValueInr, isExpiringSoon } from './reward-wallet-valuation';

type AccountWithRelations = Prisma.RewardAccountGetPayload<{
  include: {
    balances: true;
    userCard: {
      include: {
        creditCard: {
          include: {
            bank: true;
            rewardProgram: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class RewardWalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardExpiry: RewardExpiryService,
  ) {}

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  async getOverview(userId: string): Promise<RewardWalletOverview> {
    await this.requireActiveUser(userId);
    await this.ensureAccountsForPortfolio(userId);

    const accounts = await this.loadAccounts(userId);
    const cards = accounts.map((account) => this.mapCardSummary(account));
    const expiringSoon = cards.flatMap((card) =>
      card.balances
        .filter(
          (balance) =>
            balance.expiringAmount > 0 &&
            balance.expiringAt &&
            isExpiringSoon(new Date(balance.expiringAt)),
        )
        .map(
          (balance): RewardWalletExpiringItem => ({
            userCardId: card.userCardId,
            cardName: card.nickname ?? card.cardName,
            kind: balance.kind,
            expiringAmount: balance.expiringAmount,
            expiringAt: balance.expiringAt!,
            estimatedValueInr: balance.estimatedValueInr,
          }),
        ),
    );

    expiringSoon.sort(
      (a, b) => new Date(a.expiringAt).getTime() - new Date(b.expiringAt).getTime(),
    );

    const totalEstimatedValueInr = roundInr(
      cards.reduce((sum, card) => sum + card.totalEstimatedValueInr, 0),
    );
    const totalAvailablePoints = roundAmount(
      cards.reduce(
        (sum, card) =>
          sum +
          card.balances
            .filter(
              (row) => row.kind === 'POINTS' || row.kind === 'MILES' || row.kind === 'HOTEL_POINTS',
            )
            .reduce((inner, row) => inner + row.availableAmount, 0),
        0,
      ),
    );
    const totalCashbackInr = roundAmount(
      cards.reduce(
        (sum, card) =>
          sum + (card.balances.find((row) => row.kind === 'CASHBACK')?.availableAmount ?? 0),
        0,
      ),
    );

    const syncedAt = accounts
      .map((account) => account.lastSyncedAt)
      .filter((value): value is Date => value != null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    void this.rewardExpiry.syncAlerts(userId).catch(() => undefined);

    return {
      cardCount: cards.length,
      totalEstimatedValueInr,
      totalAvailablePoints,
      totalCashbackInr,
      expiringSoon,
      cards,
      lastSyncedAt: syncedAt?.toISOString() ?? null,
    };
  }

  async getCardWallet(userId: string, userCardId: string): Promise<RewardWalletCardSummary> {
    await this.requireActiveUser(userId);
    const account = await this.loadAccount(userId, userCardId);
    if (!account) {
      throw new NotFoundException('Reward wallet not found for this card');
    }
    return this.mapCardSummary(account);
  }

  async upsertCardWallet(
    userId: string,
    userCardId: string,
    input: UpsertRewardWalletInput,
  ): Promise<RewardWalletCardSummary> {
    await this.requireActiveUser(userId);

    const userCard = await this.prisma.userCard.findFirst({
      where: { id: userCardId, userId, status: 'ACTIVE' },
      include: {
        creditCard: { include: { bank: true, rewardProgram: true } },
      },
    });
    if (!userCard) {
      throw new NotFoundException('Portfolio card not found');
    }

    const kinds = input.balances.map((row) => row.kind);
    if (new Set(kinds).size !== kinds.length) {
      throw new BadRequestException('Duplicate balance kinds in request');
    }

    const pointValueInr =
      userCard.creditCard.rewardProgram?.pointValueInr != null
        ? Number(userCard.creditCard.rewardProgram.pointValueInr)
        : null;

    const account = await this.prisma.rewardAccount.upsert({
      where: { userCardId },
      create: {
        id: newUuidV7(),
        userId,
        userCardId,
        lastSyncedAt: new Date(),
      },
      update: {
        lastSyncedAt: new Date(),
      },
      include: {
        balances: true,
        userCard: {
          include: {
            creditCard: { include: { bank: true, rewardProgram: true } },
          },
        },
      },
    });

    for (const row of input.balances) {
      const estimatedValueInr = estimateBalanceValueInr(
        row.kind,
        row.availableAmount,
        pointValueInr,
      );
      await this.prisma.rewardBalance.upsert({
        where: {
          rewardAccountId_kind: {
            rewardAccountId: account.id,
            kind: row.kind,
          },
        },
        create: {
          id: newUuidV7(),
          rewardAccountId: account.id,
          kind: row.kind,
          availableAmount: row.availableAmount,
          pendingAmount: row.pendingAmount ?? 0,
          expiredAmount: row.expiredAmount ?? 0,
          expiringAmount: row.expiringAmount ?? 0,
          expiringAt: row.expiringAt ? new Date(row.expiringAt) : null,
          estimatedValueInr,
        },
        update: {
          availableAmount: row.availableAmount,
          pendingAmount: row.pendingAmount ?? 0,
          expiredAmount: row.expiredAmount ?? 0,
          expiringAmount: row.expiringAmount ?? 0,
          expiringAt: row.expiringAt ? new Date(row.expiringAt) : null,
          estimatedValueInr,
        },
      });
    }

    const refreshed = await this.loadAccount(userId, userCardId);
    if (!refreshed) {
      throw new NotFoundException('Reward wallet not found after update');
    }

    void this.rewardExpiry.syncAlerts(userId).catch(() => undefined);

    return this.mapCardSummary(refreshed);
  }

  private async ensureAccountsForPortfolio(userId: string): Promise<void> {
    const cards = await this.prisma.userCard.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { id: true },
    });

    for (const card of cards) {
      const existing = await this.prisma.rewardAccount.findUnique({
        where: { userCardId: card.id },
      });
      if (existing) continue;

      await this.prisma.rewardAccount.create({
        data: {
          id: newUuidV7(),
          userId,
          userCardId: card.id,
        },
      });
    }
  }

  private async loadAccounts(userId: string): Promise<AccountWithRelations[]> {
    return this.prisma.rewardAccount.findMany({
      where: {
        userId,
        userCard: { status: 'ACTIVE' },
      },
      include: {
        balances: true,
        userCard: {
          include: {
            creditCard: {
              include: {
                bank: true,
                rewardProgram: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async loadAccount(
    userId: string,
    userCardId: string,
  ): Promise<AccountWithRelations | null> {
    return this.prisma.rewardAccount.findFirst({
      where: { userId, userCardId, userCard: { status: 'ACTIVE' } },
      include: {
        balances: true,
        userCard: {
          include: {
            creditCard: {
              include: {
                bank: true,
                rewardProgram: true,
              },
            },
          },
        },
      },
    });
  }

  private mapCardSummary(account: AccountWithRelations): RewardWalletCardSummary {
    const card = account.userCard.creditCard;
    const balances = account.balances.map((row) => this.mapBalanceLine(row));
    const totalEstimatedValueInr = roundInr(
      balances.reduce((sum, row) => sum + (row.estimatedValueInr ?? 0), 0),
    );

    return {
      userCardId: account.userCardId,
      cardName: card.name,
      bankName: card.bank.name,
      bankSlug: card.bank.slug,
      cardSlug: card.slug,
      nickname: account.userCard.nickname,
      rewardProgramName: card.rewardProgram?.name ?? null,
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      totalEstimatedValueInr,
      balances,
    };
  }

  private mapBalanceLine(row: RewardBalance): RewardBalanceLine {
    return {
      kind: row.kind as RewardBalanceKind,
      availableAmount: Number(row.availableAmount),
      pendingAmount: Number(row.pendingAmount),
      expiredAmount: Number(row.expiredAmount),
      expiringAmount: Number(row.expiringAmount),
      expiringAt: row.expiringAt?.toISOString() ?? null,
      estimatedValueInr: row.estimatedValueInr != null ? Number(row.estimatedValueInr) : null,
    };
  }
}

function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}
