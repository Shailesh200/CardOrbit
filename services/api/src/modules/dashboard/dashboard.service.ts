import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { initAnalytics, trackPersonalizedHomepageViewed } from '@cardwise/analytics';
import { FeatureFlag } from '@cardwise/feature-flags';
import {
  mergeDashboardPreferences,
  parseDashboardPreferences,
  parseRewardPersonalizationProfile,
  resolveVisibleDashboardWidgets,
  type DashboardPreferences,
  type DashboardWidgetId,
  type HomepageExpiringReward,
  type HomepageMilestonePreview,
  type HomepageRecentActivityItem,
  type HomepageRewardWalletPreview,
  type HomepageTravelPreview,
  type UpdateDashboardPreferencesInput,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { MerchantsService } from '../merchants/merchants.service';
import { MerchantPreferencesService } from '../merchants/merchant-preferences.service';
import { MilestonesService } from '../milestones/milestones.service';
import { OfferMatchingService } from '../offers/offer-matching.service';
import { RewardWalletService } from '../reward-wallet/reward-wallet.service';
import { TravelHubService } from '../travel-hub/travel-hub.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UserCardsService } from '../user-cards/user-cards.service';
import { DashboardInsightsService } from './dashboard-insights.service';
import {
  buildMorningSummary,
  buildRecommendedActions,
  mapExpiringRewards,
  mapMilestonePreviews,
  mapRecentActivityItems,
  mapTravelPreview,
  resolvePersonalizedHomepageWidgets,
} from './personalized-homepage.builder';

const TRAILING_OPAQUE_ID = /\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stripTrailingOpaqueId(title: string | null | undefined): string {
  return (title ?? '').replace(TRAILING_OPAQUE_ID, '').trim();
}

const CATEGORY_SCENARIO: Record<
  string,
  { merchantSlug: string; merchantName: string; categorySlug: string; amount: number }
> = {
  dining: {
    merchantSlug: 'swiggy',
    merchantName: 'Swiggy',
    categorySlug: 'dining',
    amount: 850,
  },
  shopping: {
    merchantSlug: 'amazon',
    merchantName: 'Amazon',
    categorySlug: 'shopping',
    amount: 2500,
  },
  travel: {
    merchantSlug: 'makemytrip',
    merchantName: 'MakeMyTrip',
    categorySlug: 'travel',
    amount: 15000,
  },
  groceries: {
    merchantSlug: 'bigbasket',
    merchantName: 'BigBasket',
    categorySlug: 'groceries',
    amount: 1200,
  },
  entertainment: {
    merchantSlug: 'bookmyshow',
    merchantName: 'BookMyShow',
    categorySlug: 'entertainment',
    amount: 600,
  },
};

const DEFAULT_SCENARIO = CATEGORY_SCENARIO.dining!;

@Injectable()
export class DashboardService {
  private analyticsReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userCards: UserCardsService,
    private readonly merchants: MerchantsService,
    private readonly merchantPreferences: MerchantPreferencesService,
    private readonly offerMatching: OfferMatchingService,
    private readonly dashboardInsights: DashboardInsightsService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly rewardWallet: RewardWalletService,
    private readonly milestones: MilestonesService,
    private readonly travelHub: TravelHubService,
    private readonly transactions: TransactionsService,
  ) {}

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  async getDashboardPreferences(userId: string): Promise<DashboardPreferences> {
    const user = await this.requireActiveUser(userId);
    return parseDashboardPreferences(user.dashboardPreferences);
  }

  async updateDashboardPreferences(
    userId: string,
    patch: UpdateDashboardPreferencesInput,
  ): Promise<DashboardPreferences> {
    const user = await this.requireActiveUser(userId);
    const merged = mergeDashboardPreferences(user.dashboardPreferences, patch);
    await this.prisma.user.update({
      where: { id: userId },
      data: { dashboardPreferences: merged as object },
    });
    return merged;
  }

  async getDashboardSnapshot(userId: string) {
    const user = await this.requireActiveUser(userId);
    const personalization = parseRewardPersonalizationProfile(user.personalizationProfile);
    const preferences = parseDashboardPreferences(user.dashboardPreferences);
    const personalizedHomeEnabled = await this.featureFlags.isEnabled(
      FeatureFlag.PERSONALIZED_HOMEPAGE,
      userId,
    );

    const [portfolio, popularMerchants, matchedOffers, favoriteMerchants, homeSignals] =
      await Promise.all([
        this.userCards.listPortfolio(userId).catch(() => []),
        this.merchants.listPopular(userId).catch(() => []),
        this.offerMatching
          .matchOffers(userId, { limit: 6, status: 'active' })
          .catch(() => ({ items: [], total: 0, merchantSlug: null, amountInr: null })),
        this.merchantPreferences.listFavoriteMerchantSummaries(userId).catch(() => []),
        personalizedHomeEnabled ? this.loadHomepageSignals(userId) : Promise.resolve(null),
      ]);

    const favoriteCards = portfolio.filter((card) => card.isFavorite).slice(0, 4);
    const recentCards = [...portfolio]
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, 4);

    const preferredCategory =
      personalization.preferredCategorySlugs[0] ??
      personalization.categories?.[0]?.toLowerCase() ??
      null;

    const recommendationScenario = this.resolveRecommendationScenario(preferredCategory);
    const insights = await this.dashboardInsights.resolveInsights({
      userId,
      preferredRewardType: personalization.preferredRewardType,
      preferredCategorySlugs: personalization.preferredCategorySlugs,
      categories: personalization.categories,
      boostFavoriteCards: personalization.boostFavoriteCards,
      recommendationScenario,
      cardCount: portfolio.length,
      favoriteCount: favoriteCards.length,
    });
    const offers = matchedOffers.items.slice(0, 3).map((offer) => ({
      id: offer.id,
      slug: offer.slug,
      title: stripTrailingOpaqueId(offer.title) || offer.title,
      description: offer.description,
      cashbackPercent: offer.cashbackPercent,
      validUntil: offer.validUntil,
      isEligible: offer.isEligible,
      bestEstimatedSavingsInr: offer.bestEstimatedSavingsInr,
      merchantName: offer.merchants[0]?.name ?? null,
    }));

    const preferredRewardLabel =
      personalization.preferredRewardType === 'cashback'
        ? 'cashback'
        : personalization.preferredRewardType === 'airline_miles'
          ? 'airline miles'
          : personalization.preferredRewardType === 'hotel_points'
            ? 'hotel points'
            : personalization.preferredRewardType === 'reward_points'
              ? 'reward points'
              : 'rewards';

    const availableWidgets = personalizedHomeEnabled
      ? resolvePersonalizedHomepageWidgets({
          portfolioCount: portfolio.length,
          favoriteCardCount: favoriteCards.length,
          offerCount: offers.length,
          expiringCount: homeSignals?.expiringRewards.length ?? 0,
          milestoneCount: homeSignals?.milestones.length ?? 0,
          hasTravelContext: homeSignals?.travel?.hasTravelContext ?? false,
          recentActivityCount: homeSignals?.recentActivity.length ?? 0,
          favoriteMerchantCount: favoriteMerchants.length,
        })
      : this.resolveLegacyAvailableWidgets({
          cardCount: portfolio.length,
          favoriteCount: favoriteCards.length,
          offerCount: offers.length,
        });

    const widgets = resolveVisibleDashboardWidgets(preferences, availableWidgets);

    const morningSummary =
      personalizedHomeEnabled && homeSignals
        ? buildMorningSummary({
            greetingName: user.fullName?.split(/\s+/)[0] ?? null,
            portfolioCount: portfolio.length,
            preferredRewardLabel,
            preferredCategorySlug: preferredCategory,
            offerCount: offers.length,
            favoriteMerchantCount: favoriteMerchants.length,
            favoriteCardCount: favoriteCards.length,
            wallet: homeSignals.wallet,
            expiringRewards: homeSignals.expiringRewards,
            milestones: homeSignals.milestones,
            travel: homeSignals.travel,
            recentActivityCount: homeSignals.recentActivity.length,
          })
        : null;

    const recommendedActions =
      personalizedHomeEnabled && homeSignals
        ? buildRecommendedActions({
            greetingName: user.fullName?.split(/\s+/)[0] ?? null,
            portfolioCount: portfolio.length,
            preferredRewardLabel,
            preferredCategorySlug: preferredCategory,
            offerCount: offers.length,
            favoriteMerchantCount: favoriteMerchants.length,
            favoriteCardCount: favoriteCards.length,
            wallet: homeSignals.wallet,
            expiringRewards: homeSignals.expiringRewards,
            milestones: homeSignals.milestones,
            travel: homeSignals.travel,
            recentActivityCount: homeSignals.recentActivity.length,
          })
        : [];

    if (personalizedHomeEnabled) {
      this.trackHomepageViewed(userId, {
        sectionCount: widgets.length,
        actionCount: recommendedActions.length,
        expiringRewardCount: homeSignals?.expiringRewards.length ?? 0,
        milestoneCount: homeSignals?.milestones.length ?? 0,
        hasTravelContext: homeSignals?.travel?.hasTravelContext ?? false,
        recentActivityCount: homeSignals?.recentActivity.length ?? 0,
      });
    }

    return {
      greetingName: user.fullName?.split(/\s+/)[0] ?? null,
      personalizedHomepage: personalizedHomeEnabled,
      morningSummary,
      recommendedActions,
      expiringRewards: homeSignals?.expiringRewards ?? [],
      milestonesPreview: homeSignals?.milestones ?? [],
      travelPreview: homeSignals?.travel ?? null,
      recentActivity: homeSignals?.recentActivity ?? [],
      rewardWalletPreview: homeSignals?.wallet ?? null,
      personalization: {
        preferredRewardType: personalization.preferredRewardType,
        preferredRewardLabel,
        preferredCategorySlugs: personalization.preferredCategorySlugs,
        spendBand: personalization.spendBand ?? null,
        boostFavoriteCards: personalization.boostFavoriteCards,
      },
      recommendationScenario,
      insights,
      favoriteCards,
      recentCards,
      portfolioPreview: portfolio.slice(0, 4),
      portfolioCount: portfolio.length,
      trendingMerchants: popularMerchants.slice(0, 6),
      favoriteMerchants,
      offers,
      widgets,
      preferences,
    };
  }

  private async loadHomepageSignals(userId: string): Promise<{
    wallet: HomepageRewardWalletPreview | null;
    expiringRewards: HomepageExpiringReward[];
    milestones: HomepageMilestonePreview[];
    travel: HomepageTravelPreview | null;
    recentActivity: HomepageRecentActivityItem[];
  }> {
    const [walletResult, milestonesResult, travelResult, transactionsResult] =
      await Promise.allSettled([
        this.rewardWallet.getOverview(userId),
        this.milestones.getSpendMilestones(userId),
        this.travelHub.getOverview(userId),
        this.transactions.list(userId, { page: 1, pageSize: 5 }),
      ]);

    const walletOverview = walletResult.status === 'fulfilled' ? walletResult.value : null;
    const milestonesOverview =
      milestonesResult.status === 'fulfilled' ? milestonesResult.value : null;
    const travelOverview = travelResult.status === 'fulfilled' ? travelResult.value : null;
    const transactionList =
      transactionsResult.status === 'fulfilled' ? transactionsResult.value : null;

    const wallet: HomepageRewardWalletPreview | null = walletOverview
      ? {
          cardCount: walletOverview.cardCount,
          totalEstimatedValueInr: walletOverview.totalEstimatedValueInr,
          expiringSoonCount: walletOverview.expiringSoon.length,
        }
      : null;

    return {
      wallet,
      expiringRewards: mapExpiringRewards(walletOverview?.expiringSoon ?? []),
      milestones: mapMilestonePreviews(milestonesOverview?.spendMilestones ?? []),
      travel: mapTravelPreview(travelOverview),
      recentActivity: mapRecentActivityItems(
        (transactionList?.items ?? []).map((row) => ({
          id: row.id,
          merchantName: row.merchantName,
          cardName: row.cardName,
          amountInr: row.amountInr,
          categoryLabel: row.categoryLabel,
          transactedAt: row.transactedAt,
        })),
      ),
    };
  }

  private resolveRecommendationScenario(preferredCategory: string | null) {
    if (!preferredCategory) return DEFAULT_SCENARIO;
    const normalized = preferredCategory.toLowerCase();
    return CATEGORY_SCENARIO[normalized] ?? DEFAULT_SCENARIO;
  }

  private resolveLegacyAvailableWidgets(input: {
    cardCount: number;
    favoriteCount: number;
    offerCount: number;
  }): DashboardWidgetId[] {
    const widgets: DashboardWidgetId[] = [
      'insights',
      'recommendation',
      'savings',
      'portfolio',
      'merchants',
    ];

    if (input.favoriteCount > 0) {
      widgets.splice(3, 0, 'favorite-cards');
    }

    if (input.offerCount > 0) {
      widgets.splice(widgets.indexOf('merchants'), 0, 'offers');
    }

    if (input.cardCount === 0) {
      return widgets.filter((id) => id !== 'favorite-cards');
    }

    return widgets;
  }

  private trackHomepageViewed(
    userId: string,
    properties: {
      sectionCount: number;
      actionCount: number;
      expiringRewardCount: number;
      milestoneCount: number;
      hasTravelContext: boolean;
      recentActivityCount: number;
    },
  ) {
    try {
      if (!this.analyticsReady) {
        initAnalytics({});
        this.analyticsReady = true;
      }
      trackPersonalizedHomepageViewed(properties, { distinctId: userId });
    } catch {
      // Analytics must never break homepage rendering.
    }
  }
}
