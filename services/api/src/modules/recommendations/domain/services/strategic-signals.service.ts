import { Inject, Injectable } from '@nestjs/common';
import type { RecommendationStrategicCardSignal } from '@cardwise/validation';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { MilestonesService } from '../../../milestones/milestones.service';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../../../rewards/domain/repositories/reward-rule.repository';
import { RewardWalletService } from '../../../reward-wallet/reward-wallet.service';
import { isTravelCategorySlug } from './strategic-ranking';

const TRAVEL_SPEND_CODES = new Set(['TRAVEL', 'AIR', 'HOTEL', 'FLIGHT']);

@Injectable()
export class StrategicSignalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly milestones: MilestonesService,
    private readonly rewardWallet: RewardWalletService,
    @Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository,
  ) {}

  async loadSignals(input: {
    userId: string;
    userCardIds: string[];
    creditCardIds: string[];
    categorySlug?: string | null;
  }): Promise<{
    isTravelCategory: boolean;
    signalsByUserCardId: Record<string, RecommendationStrategicCardSignal>;
  }> {
    const isTravelCategory = isTravelCategorySlug(input.categorySlug);

    if (input.userCardIds.length === 0) {
      return { isTravelCategory, signalsByUserCardId: {} };
    }

    const [milestoneOverview, wallet, travelAffinity] = await Promise.all([
      this.milestones.getSpendMilestones(input.userId),
      this.rewardWallet.getOverview(input.userId),
      this.loadTravelAffinity(input.userCardIds),
    ]);

    const bestMilestoneByCard = new Map<
      string,
      {
        progressPercent: number;
        remainingSpendInr: number;
        milestoneBonus: number;
        label: string;
      }
    >();

    for (const row of milestoneOverview.spendMilestones) {
      if (row.status === 'ACHIEVED' || row.remainingSpendInr <= 0) continue;
      const existing = bestMilestoneByCard.get(row.userCardId);
      if (!existing || row.progressPercent > existing.progressPercent) {
        bestMilestoneByCard.set(row.userCardId, {
          progressPercent: row.progressPercent,
          remainingSpendInr: row.remainingSpendInr,
          milestoneBonus: row.milestoneBonus ?? 0,
          label: row.label,
        });
      }
    }

    const expiringByCard = new Map<string, number>();
    for (const card of wallet.cards) {
      const fromLines = card.balances
        .filter((balance) => balance.expiringAmount > 0)
        .reduce((sum, balance) => {
          const unit =
            balance.availableAmount > 0 && balance.estimatedValueInr != null
              ? balance.estimatedValueInr / balance.availableAmount
              : 0;
          return sum + balance.expiringAmount * unit;
        }, 0);
      expiringByCard.set(card.userCardId, fromLines);
    }

    const signalsByUserCardId: Record<string, RecommendationStrategicCardSignal> = {};
    for (const userCardId of input.userCardIds) {
      const milestone = bestMilestoneByCard.get(userCardId);
      signalsByUserCardId[userCardId] = {
        milestoneProgressPercent: milestone?.progressPercent ?? 0,
        milestoneRemainingInr: milestone?.remainingSpendInr ?? 0,
        milestoneBonusValueInr: milestone?.milestoneBonus ?? 0,
        milestoneLabel: milestone?.label ?? null,
        expiringRewardsInr: expiringByCard.get(userCardId) ?? 0,
        travelAffinityScore: travelAffinity.get(userCardId) ?? 0,
      };
    }

    return { isTravelCategory, signalsByUserCardId };
  }

  private async loadTravelAffinity(userCardIds: string[]): Promise<Map<string, number>> {
    const affinity = new Map<string, number>();
    if (userCardIds.length === 0) return affinity;

    const cards = await this.prisma.userCard.findMany({
      where: { id: { in: userCardIds } },
      select: {
        id: true,
        creditCardId: true,
        creditCard: {
          select: {
            benefits: {
              where: { deletedAt: null },
              select: {
                benefitType: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    await Promise.all(
      cards.map(async (row) => {
        const benefitCodes = row.creditCard.benefits.map((b) => b.benefitType?.code ?? '');
        const loungeOrTravel = benefitCodes.filter(
          (code) => code === 'LOUNGE' || code === 'TRAVEL' || code === 'INSURANCE',
        ).length;
        let score = Math.min(0.7, loungeOrTravel * 0.2);

        const rules = await this.rewardRules.listActiveForCard(row.creditCardId);
        const travelRules = rules.filter((view) =>
          TRAVEL_SPEND_CODES.has((view.spendCategoryCode ?? '').toUpperCase()),
        );
        score = Math.min(1, score + travelRules.length * 0.25);
        affinity.set(row.id, score);
      }),
    );

    return affinity;
  }
}
