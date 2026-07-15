import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AnalyticsEvent, initAnalytics, trackEvent } from '@cardwise/analytics';
import type {
  LifestyleBenefitsOverview,
  LifestyleCardProfile,
  LifestyleSectionOverview,
  LifestyleSpendingSummary,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  filterBenefitsBySection,
  mapRewardRuleSummary,
} from '../card-benefits/card-benefits.mapper';
import {
  REWARD_RULE_REPOSITORY,
  type RewardRuleRepository,
} from '../rewards/domain/repositories/reward-rule.repository';
import { RewardWalletService } from '../reward-wallet/reward-wallet.service';
import {
  enrichDiningBenefits,
  enrichEmiBenefits,
  enrichFuelBenefits,
  enrichInsuranceBenefits,
  summarizeDiningBenefits,
  summarizeEmiBenefits,
  summarizeFuelBenefits,
  summarizeInsuranceBenefits,
} from './lifestyle-benefits-enrichment';

const LOOKBACK_DAYS = 90;
const LIFESTYLE_SPEND_CODES = new Set(['FUEL', 'DINING', 'RESTAURANT', 'FOOD']);

type LifestyleSection = LifestyleSectionOverview['section'];

@Injectable()
export class LifestyleBenefitsService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardWallet: RewardWalletService,
    @Inject(REWARD_RULE_REPOSITORY) private readonly rewardRules: RewardRuleRepository,
  ) {}

  async getOverview(userId: string): Promise<LifestyleBenefitsOverview> {
    await this.requireActiveUser(userId);
    const [cards, fuelSpending, diningSpending] = await Promise.all([
      this.buildCardProfiles(userId),
      this.buildCategorySpending(userId, 'fuel'),
      this.buildCategorySpending(userId, 'dining'),
    ]);

    const overview: LifestyleBenefitsOverview = {
      cardCount: cards.length,
      insuranceCardCount: cards.filter((card) => card.insuranceBenefits.length > 0).length,
      fuelCardCount: cards.filter((card) => card.fuelBenefits.length > 0).length,
      diningCardCount: cards.filter((card) => card.diningBenefits.length > 0).length,
      emiCardCount: cards.filter((card) => card.emiBenefits.length > 0).length,
      bestFuelCardUserCardId: pickBestFuelCard(cards),
      bestDiningCardUserCardId: pickBestDiningCard(cards),
      cards,
      fuelSpending,
      diningSpending,
    };

    this.trackEvent(userId, AnalyticsEvent.LIFESTYLE_BENEFITS_VIEWED, {
      cardCount: overview.cardCount,
      insuranceCardCount: overview.insuranceCardCount,
      fuelCardCount: overview.fuelCardCount,
      diningCardCount: overview.diningCardCount,
    });

    return overview;
  }

  async getSection(userId: string, section: LifestyleSection): Promise<LifestyleSectionOverview> {
    await this.requireActiveUser(userId);
    const cards = await this.buildCardProfiles(userId);
    const filtered = cards.filter((card) => cardHasSection(card, section));

    return {
      section,
      cardCount: filtered.length,
      cards: filtered,
    };
  }

  async getInsurance(userId: string): Promise<LifestyleSectionOverview> {
    return this.getSection(userId, 'INSURANCE');
  }

  async getFuel(userId: string): Promise<LifestyleSectionOverview> {
    return this.getSection(userId, 'FUEL');
  }

  async getDining(userId: string): Promise<LifestyleSectionOverview> {
    return this.getSection(userId, 'DINING');
  }

  async getEmi(userId: string): Promise<LifestyleSectionOverview> {
    return this.getSection(userId, 'EMI');
  }

  private async buildCardProfiles(userId: string): Promise<LifestyleCardProfile[]> {
    await this.rewardWallet.getOverview(userId);

    const rows = await this.prisma.userCard.findMany({
      where: { userId, status: { not: 'REMOVED' } },
      include: {
        creditCard: {
          include: {
            bank: true,
            network: true,
            benefits: {
              where: { deletedAt: null },
              orderBy: { title: 'asc' },
              include: { benefitType: true },
            },
          },
        },
      },
    });

    return Promise.all(
      rows.map(async (row) => {
        const card = row.creditCard;
        const cardSourceUrl = card.sourceUrl ?? null;
        const benefits = card.benefits;

        const insuranceItems = enrichInsuranceBenefits(
          filterBenefitsBySection(benefits, cardSourceUrl, 'INSURANCE'),
        );
        const fuelItems = enrichFuelBenefits(
          filterBenefitsBySection(benefits, cardSourceUrl, 'FUEL'),
        );
        const diningItems = enrichDiningBenefits(
          filterBenefitsBySection(benefits, cardSourceUrl, 'DINING'),
        );
        const emiItems = enrichEmiBenefits(filterBenefitsBySection(benefits, cardSourceUrl, 'EMI'));

        const activeRules = await this.rewardRules.listActiveForCard(card.id);
        const lifestyleRewardRules = activeRules
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
              LIFESTYLE_SPEND_CODES.has(rule.spendCategoryCode.toUpperCase()),
          )
          .map((rule) => ({
            id: rule.id,
            name: rule.name,
            spendCategoryCode: rule.spendCategoryCode,
            rewardMultiplier: rule.rewardMultiplier,
            cashbackPercent: rule.cashbackPercent,
          }));

        return {
          userCardId: row.id,
          creditCardId: card.id,
          cardName: row.nickname ?? card.name,
          bankName: card.bank.name,
          networkName: card.network.name,
          insuranceSummary: summarizeInsuranceBenefits(insuranceItems),
          fuelSummary: summarizeFuelBenefits(fuelItems),
          diningSummary: summarizeDiningBenefits(diningItems),
          emiSummary: summarizeEmiBenefits(emiItems),
          insuranceBenefits: insuranceItems,
          fuelBenefits: fuelItems,
          diningBenefits: diningItems,
          emiBenefits: emiItems,
          lifestyleRewardRules,
        };
      }),
    );
  }

  private async buildCategorySpending(
    userId: string,
    categorySlug: string,
  ): Promise<LifestyleSpendingSummary> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS);

    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        categorySlug,
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

function cardHasSection(card: LifestyleCardProfile, section: LifestyleSection): boolean {
  switch (section) {
    case 'INSURANCE':
      return card.insuranceBenefits.length > 0;
    case 'FUEL':
      return card.fuelBenefits.length > 0;
    case 'DINING':
      return card.diningBenefits.length > 0;
    case 'EMI':
      return card.emiBenefits.length > 0;
  }
}

function pickBestFuelCard(cards: LifestyleCardProfile[]): string | null {
  const candidates = cards.filter((card) => card.fuelBenefits.length > 0);
  if (candidates.length === 0) return null;

  const scored = candidates.map((card) => {
    let score = 0;
    if (card.fuelBenefits.some((row) => row.surchargeWaiver)) score += 100;
    score += card.fuelBenefits.length * 5;
    score +=
      card.lifestyleRewardRules.filter((row) => row.spendCategoryCode === 'FUEL').length * 10;
    return { userCardId: card.userCardId, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.userCardId ?? null;
}

function pickBestDiningCard(cards: LifestyleCardProfile[]): string | null {
  const candidates = cards.filter((card) => card.diningBenefits.length > 0);
  if (candidates.length === 0) return null;

  const scored = candidates.map((card) => {
    const maxDiscount = Math.max(...card.diningBenefits.map((row) => row.discountPercent ?? 0));
    let score = maxDiscount * 2;
    score += card.diningBenefits.length * 5;
    score +=
      card.lifestyleRewardRules.filter((row) =>
        ['DINING', 'RESTAURANT', 'FOOD'].includes(row.spendCategoryCode ?? ''),
      ).length * 10;
    return { userCardId: card.userCardId, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.userCardId ?? null;
}

function roundInr(value: number): number {
  return Math.round(value * 100) / 100;
}
