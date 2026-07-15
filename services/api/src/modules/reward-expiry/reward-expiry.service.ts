import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { RewardExpiryIntelligence } from '@cardwise/validation';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { estimateBalanceValueInr } from '../reward-wallet/reward-wallet-valuation';
import {
  buildDedupeKey,
  buildRewardExpiryIntelligence,
  formatExpiryNotification,
  type ExpiryBalanceInput,
} from './reward-expiry-intelligence';
import type { RewardExpiryAlertWindow } from '@cardwise/validation';

type BalanceWithCard = Prisma.RewardBalanceGetPayload<{
  include: {
    account: {
      include: {
        userCard: {
          include: {
            creditCard: { include: { bank: true; rewardProgram: true } };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class RewardExpiryService {
  private readonly logger = new Logger(RewardExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getIntelligence(userId: string, syncAlerts = true): Promise<RewardExpiryIntelligence> {
    await this.requireActiveUser(userId);
    const balances = await this.loadExpiringBalances(userId);
    const inputs = balances.map((row) => this.toExpiryInput(row));
    const alertsDelivered = syncAlerts ? await this.syncExpiryAlerts(userId, inputs) : 0;
    return buildRewardExpiryIntelligence(inputs, alertsDelivered);
  }

  /** Delivers deduplicated expiry alerts without returning the full intelligence payload. */
  async syncAlerts(userId: string): Promise<number> {
    await this.requireActiveUser(userId);
    const balances = await this.loadExpiringBalances(userId);
    const inputs = balances.map((row) => this.toExpiryInput(row));
    return this.syncExpiryAlerts(userId, inputs);
  }

  /** Scans all active users — intended for cron / CLI batch runs. */
  async scanAllUsers(): Promise<{ usersScanned: number; alertsDelivered: number }> {
    const accounts = await this.prisma.rewardAccount.findMany({
      where: {
        user: { accountStatus: 'ACTIVE' },
        userCard: { status: 'ACTIVE' },
        balances: {
          some: {
            expiringAmount: { gt: 0 },
            expiringAt: { not: null },
          },
        },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const uniqueUserIds = accounts.map((row) => row.userId);
    let alertsDelivered = 0;

    for (const userId of uniqueUserIds) {
      try {
        const balances = await this.loadExpiringBalances(userId);
        const inputs = balances.map((row) => this.toExpiryInput(row));
        alertsDelivered += await this.syncExpiryAlerts(userId, inputs);
      } catch (error) {
        this.logger.warn(
          `Reward expiry scan failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { usersScanned: uniqueUserIds.length, alertsDelivered };
  }

  private async syncExpiryAlerts(userId: string, inputs: ExpiryBalanceInput[]): Promise<number> {
    const intelligence = buildRewardExpiryIntelligence(inputs, 0);
    let delivered = 0;

    for (const item of intelligence.expiringSoon) {
      if (item.alertWindow == null) continue;

      const alertWindow = item.alertWindow as RewardExpiryAlertWindow;
      const dedupeKey = buildDedupeKey(userId, item.balanceId, alertWindow);
      const existing = await this.prisma.notification.findFirst({
        where: { userId, dedupeKey },
      });
      if (existing) continue;

      const { title, body } = formatExpiryNotification(item);

      try {
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'REWARD_EXPIRY',
            title,
            body,
            linkUrl: '/account/rewards',
            dedupeKey,
          },
        });
        delivered += 1;
      } catch (error) {
        this.logger.debug(
          `Skipped duplicate reward expiry alert ${dedupeKey}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return delivered;
  }

  private async loadExpiringBalances(userId: string): Promise<BalanceWithCard[]> {
    return this.prisma.rewardBalance.findMany({
      where: {
        expiringAmount: { gt: 0 },
        expiringAt: { not: null },
        account: {
          userId,
          userCard: { status: 'ACTIVE' },
        },
      },
      include: {
        account: {
          include: {
            userCard: {
              include: {
                creditCard: { include: { bank: true, rewardProgram: true } },
              },
            },
          },
        },
      },
      orderBy: { expiringAt: 'asc' },
    });
  }

  private toExpiryInput(row: BalanceWithCard): ExpiryBalanceInput {
    const card = row.account.userCard.creditCard;
    const pointValueInr =
      card.rewardProgram?.pointValueInr != null ? Number(card.rewardProgram.pointValueInr) : null;
    const expiringAmount = Number(row.expiringAmount);
    const estimatedValueInr =
      row.estimatedValueInr != null
        ? Number(row.estimatedValueInr)
        : estimateBalanceValueInr(row.kind, expiringAmount, pointValueInr);

    return {
      balanceId: row.id,
      userCardId: row.account.userCardId,
      cardName: row.account.userCard.nickname ?? card.name,
      bankName: card.bank.name,
      bankSlug: card.bank.slug,
      cardSlug: card.slug,
      kind: row.kind,
      expiringAmount,
      expiringAt: row.expiringAt!,
      estimatedValueInr,
    };
  }

  private async requireActiveUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
  }
}
