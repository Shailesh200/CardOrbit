import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  initAnalytics,
  trackContextualNotificationsSynced,
  trackNotificationDelivered,
} from '@cardwise/analytics';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  parseNotificationPreferences,
  parseRewardPersonalizationProfile,
  type ContextualNotificationCandidate,
  type ContextualNotificationSyncResult,
} from '@cardwise/validation';
import type { NotificationType } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { MilestonesService } from '../milestones/milestones.service';
import { OfferMatchingService } from '../offers/offer-matching.service';
import { TravelHubService } from '../travel-hub/travel-hub.service';
import {
  buildBillDueCandidates,
  buildMilestoneCandidates,
  buildOfferMatchCandidates,
  buildPurchaseTimingCandidates,
  buildTravelTipCandidates,
  collectContextualCandidates,
  isoWeekKey,
} from './contextual-notifications.builder';

@Injectable()
export class ContextualNotificationsService {
  private readonly logger = new Logger(ContextualNotificationsService.name);
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly milestones: MilestonesService,
    private readonly billing: BillingService,
    private readonly offerMatching: OfferMatchingService,
    private readonly travelHub: TravelHubService,
  ) {}

  async isEnabled(userId: string): Promise<boolean> {
    return this.featureFlags.isEnabled(FeatureFlag.ADVANCED_NOTIFICATIONS, userId);
  }

  async syncForUser(userId: string): Promise<ContextualNotificationSyncResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('User not found');
    }

    const enabled = await this.isEnabled(userId);
    if (!enabled) {
      return { delivered: 0, candidates: 0, skipped: 0 };
    }

    const prefs = parseNotificationPreferences(user.notificationPreferences);
    if (!prefs.inAppContextual) {
      return { delivered: 0, candidates: 0, skipped: 0 };
    }

    const candidates = await this.buildCandidates(userId, user.personalizationProfile);
    let delivered = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const created = await this.deliverCandidate(userId, candidate);
      if (created) delivered += 1;
      else skipped += 1;
    }

    const result = {
      delivered,
      candidates: candidates.length,
      skipped,
    };

    this.trackSync(userId, result);
    return result;
  }

  /** Batch scan for cron/CLI — mirrors reward-expiry scan pattern. */
  async scanAllUsers(): Promise<{ usersScanned: number; alertsDelivered: number }> {
    const users = await this.prisma.user.findMany({
      where: { accountStatus: 'ACTIVE' },
      select: { id: true },
      take: 500,
    });

    let alertsDelivered = 0;
    for (const user of users) {
      try {
        const result = await this.syncForUser(user.id);
        alertsDelivered += result.delivered;
      } catch (error) {
        this.logger.warn(
          `Contextual notification sync failed for ${user.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { usersScanned: users.length, alertsDelivered };
  }

  private async buildCandidates(
    userId: string,
    personalizationProfile: unknown,
  ): Promise<ContextualNotificationCandidate[]> {
    const personalization = parseRewardPersonalizationProfile(personalizationProfile);
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [milestonesResult, billsResult, offersResult, travelResult, upcomingOffers] =
      await Promise.allSettled([
        this.milestones.getSpendMilestones(userId),
        this.billing.listBills(userId, { includePaid: false }),
        this.offerMatching.matchOffers(userId, { limit: 6, status: 'active' }),
        this.travelHub.getOverview(userId),
        this.prisma.offer.findMany({
          where: {
            deletedAt: null,
            status: { in: ['ACTIVE', 'SCHEDULED'] },
            validFrom: { gt: now, lte: in48h },
          },
          orderBy: { validFrom: 'asc' },
          take: 10,
          select: {
            id: true,
            title: true,
            cashbackPercent: true,
            validFrom: true,
          },
        }),
      ]);

    const milestones =
      milestonesResult.status === 'fulfilled' ? milestonesResult.value.spendMilestones : [];
    const bills = billsResult.status === 'fulfilled' ? billsResult.value.items : [];
    const offers = offersResult.status === 'fulfilled' ? offersResult.value.items : [];
    const travel = travelResult.status === 'fulfilled' ? travelResult.value : null;
    const upcoming = upcomingOffers.status === 'fulfilled' ? upcomingOffers.value : [];

    const bestTravelCardName =
      travel?.bestTravelCardUserCardId != null
        ? (travel.cards.find((card) => card.userCardId === travel.bestTravelCardUserCardId)
            ?.cardName ?? null)
        : (travel?.cards[0]?.cardName ?? null);

    const preferredCategory = personalization.preferredCategorySlugs[0] ?? null;
    const timingOffers = upcoming.map((offer) => ({
      id: offer.id,
      title: offer.title,
      cashbackPercent: offer.cashbackPercent != null ? String(offer.cashbackPercent) : null,
      validFrom: offer.validFrom.toISOString(),
      hoursUntilStart: (offer.validFrom.getTime() - now.getTime()) / (60 * 60 * 1000),
    }));

    // Prefer upcoming offers that match preference when present (still notify otherwise).
    const preferredTiming = preferredCategory
      ? timingOffers.filter((offer) =>
          offer.title.toLowerCase().includes(preferredCategory.toLowerCase()),
        )
      : timingOffers;

    return collectContextualCandidates([
      buildMilestoneCandidates(milestones),
      buildBillDueCandidates(bills),
      buildOfferMatchCandidates(
        offers.map((offer) => ({
          id: offer.id,
          title: offer.title,
          cashbackPercent: offer.cashbackPercent,
          bestEstimatedSavingsInr: offer.bestEstimatedSavingsInr,
          isEligible: offer.isEligible,
          merchantName: offer.merchants[0]?.name ?? null,
        })),
      ),
      buildTravelTipCandidates({
        loungeCardCount: travel?.loungeCardCount ?? 0,
        totalMiles: travel?.totalMiles ?? 0,
        bestCardName: bestTravelCardName,
        hasTravelContext: Boolean(
          travel &&
          (travel.loungeCardCount > 0 ||
            travel.totalMiles > 0 ||
            travel.travelOfferCount > 0 ||
            travel.spending.totalVolumeInr > 0),
        ),
        weekKey: isoWeekKey(now),
      }),
      buildPurchaseTimingCandidates(preferredTiming.length > 0 ? preferredTiming : timingOffers),
    ]).candidates;
  }

  private async deliverCandidate(
    userId: string,
    candidate: ContextualNotificationCandidate,
  ): Promise<boolean> {
    const existing = await this.prisma.notification.findFirst({
      where: { userId, dedupeKey: candidate.dedupeKey },
    });
    if (existing) return false;

    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: candidate.type as NotificationType,
          title: candidate.title,
          body: candidate.body,
          linkUrl: candidate.linkUrl,
          dedupeKey: candidate.dedupeKey,
        },
      });
      this.trackDelivered(userId, candidate);
      return true;
    } catch (error) {
      this.logger.debug(
        `Skipped duplicate contextual notification ${candidate.dedupeKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private trackSync(userId: string, result: ContextualNotificationSyncResult) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackContextualNotificationsSynced(result, { distinctId: userId });
    } catch {
      // Analytics must never break notification sync.
    }
  }

  private trackDelivered(userId: string, candidate: ContextualNotificationCandidate) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackNotificationDelivered(
        {
          type: candidate.type,
          channel: 'in_app',
          priority: candidate.priority,
        },
        { distinctId: userId },
      );
    } catch {
      // ignore
    }
  }
}
