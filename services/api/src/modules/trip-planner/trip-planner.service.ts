import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AnalyticsEvent,
  initAnalytics,
  trackEvent,
  type AnalyticsEventName,
} from '@cardwise/analytics';
import {
  parseTripPlanInput,
  type TripPlanInput,
  type TripPlanResult,
  type TripSpendCategory,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  REWARD_RULE_EVALUATOR,
  type RewardRuleEvaluator,
} from '../rewards/domain/ports/reward-rule-evaluator.port';
import { TravelHubService } from '../travel-hub/travel-hub.service';
import {
  applyPreferenceBoost,
  buildTripPlanResult,
  categorySlugForTripSpend,
  computeTripDays,
  splitTripBudget,
  type TripCardEvaluation,
  type TripCardSnapshot,
} from './trip-planner-engine';

const TRIP_CATEGORIES: TripSpendCategory[] = ['FLIGHTS', 'HOTELS', 'DINING', 'TRANSPORT'];

@Injectable()
export class TripPlannerService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly travelHub: TravelHubService,
    @Inject(REWARD_RULE_EVALUATOR) private readonly rewardEvaluator: RewardRuleEvaluator,
  ) {}

  async createPlan(userId: string, raw: unknown): Promise<TripPlanResult> {
    await this.requireActiveUser(userId);

    let input: TripPlanInput;
    try {
      input = parseTripPlanInput(raw);
    } catch {
      throw new BadRequestException('Invalid trip plan payload');
    }

    const overview = await this.travelHub.getOverview(userId);
    if (overview.cards.length === 0) {
      throw new BadRequestException('Add at least one card to your portfolio to plan a trip');
    }

    const cards = this.mapCardSnapshots(overview);
    const categoryIds = await this.loadCategoryIds();
    const evaluations = await this.evaluatePortfolio(input, cards, categoryIds);
    const boosted = applyPreferenceBoost(evaluations, cards, input);
    const result = buildTripPlanResult({ plan: input, cards, evaluations: boosted });

    this.trackEvent(userId, AnalyticsEvent.TRIP_PLAN_CREATED, {
      destination: result.destination,
      tripDays: result.tripDays,
      scope: result.scope,
      budgetInr: result.budgetInr,
      cardCount: overview.cardCount,
      totalEstimatedValueInr: result.totalEstimatedValueInr,
    });

    return result;
  }

  trackPlannerViewed(userId: string): void {
    this.trackEvent(userId, AnalyticsEvent.TRIP_PLANNER_VIEWED, {});
  }

  private mapCardSnapshots(
    overview: Awaited<ReturnType<TravelHubService['getOverview']>>,
  ): TripCardSnapshot[] {
    const offersByCard = new Map<string, Array<{ title: string; description: string | null }>>();
    for (const offer of overview.travelOffers) {
      const card = overview.cards.find((row) => row.cardName === offer.cardName);
      if (!card) continue;
      const existing = offersByCard.get(card.userCardId) ?? [];
      existing.push({ title: offer.title, description: offer.description });
      offersByCard.set(card.userCardId, existing);
    }

    return overview.cards.map((card) => ({
      userCardId: card.userCardId,
      creditCardId: card.creditCardId,
      cardName: card.cardName,
      bankName: card.bankName,
      loungeSummary: card.loungeSummary,
      loungeBenefits: card.loungeBenefits.map((row) => ({
        title: row.title,
        description: row.description,
        allowanceLabel: row.allowanceLabel,
      })),
      travelBenefits: card.travelBenefits.map((row) => ({
        title: row.title,
        description: row.description,
      })),
      milesBalances: card.milesBalances
        .filter(
          (row): row is typeof row & { kind: 'MILES' | 'HOTEL_POINTS' } =>
            row.kind === 'MILES' || row.kind === 'HOTEL_POINTS',
        )
        .map((row) => ({
          kind: row.kind,
          availableAmount: row.availableAmount,
          estimatedValueInr: row.estimatedValueInr,
        })),
      travelOffers: offersByCard.get(card.userCardId) ?? [],
    }));
  }

  private async loadCategoryIds(): Promise<Map<string, string>> {
    const rows = await this.prisma.spendCategory.findMany({
      where: {
        deletedAt: null,
        OR: [{ slug: 'travel' }, { slug: 'dining' }, { code: 'TRAVEL' }, { code: 'DINING' }],
      },
      select: { id: true, slug: true, code: true },
    });

    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.slug, row.id);
      map.set(row.code.toLowerCase(), row.id);
    }
    return map;
  }

  private async evaluatePortfolio(
    input: TripPlanInput,
    cards: TripCardSnapshot[],
    categoryIds: Map<string, string>,
  ): Promise<TripCardEvaluation[]> {
    const tripDays = computeTripDays(input.startDate, input.endDate);
    const budgetBreakdown = splitTripBudget(input.budgetInr, tripDays);

    const spendByCategory: Record<TripSpendCategory, number> = {
      FLIGHTS: budgetBreakdown.flightsInr,
      HOTELS: budgetBreakdown.hotelsInr,
      DINING: budgetBreakdown.diningInr,
      TRANSPORT: budgetBreakdown.transportInr,
    };

    const evaluations: TripCardEvaluation[] = [];

    for (const card of cards) {
      for (const category of TRIP_CATEGORIES) {
        const slug = categorySlugForTripSpend(category);
        const spendCategoryId = categoryIds.get(slug) ?? null;
        const spendAmountInr = spendByCategory[category] ?? 0;

        const evaluation = await this.rewardEvaluator.evaluate({
          creditCardId: card.creditCardId,
          amountInr: spendAmountInr,
          spendCategoryId,
          at: new Date(`${input.startDate}T12:00:00.000Z`),
        });

        evaluations.push({
          userCardId: card.userCardId,
          creditCardId: card.creditCardId,
          cardName: card.cardName,
          bankName: card.bankName,
          category,
          spendAmountInr,
          expectedRewardInr: evaluation?.estimatedValueInr ?? 0,
          estimatedPoints: evaluation?.rewardPoints ?? 0,
          effectiveRatePercent: evaluation?.effectiveRatePercent ?? 0,
          ruleName: evaluation?.ruleName ?? null,
          excluded: evaluation?.excluded ?? true,
          preferenceBoost: 0,
        });
      }
    }

    return evaluations;
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  private trackEvent(
    userId: string,
    event: AnalyticsEventName,
    properties: Record<string, unknown>,
  ): void {
    if (!this.analyticsReady) {
      initAnalytics({
        useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
      });
      this.analyticsReady = true;
    }
    trackEvent(event, properties, { distinctId: userId });
  }
}
