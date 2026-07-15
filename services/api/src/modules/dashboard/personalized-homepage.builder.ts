import {
  displayCategoryLabel,
  type DashboardWidgetId,
  type HomepageExpiringReward,
  type HomepageMilestonePreview,
  type HomepageMorningSummary,
  type HomepageRecommendedAction,
  type HomepageRecentActivityItem,
  type HomepageRewardWalletPreview,
  type HomepageTimeOfDay,
  type HomepageTravelPreview,
  type RewardWalletExpiringItem,
  type SpendMilestoneProgress,
  type TravelHubOverview,
} from '@cardwise/validation';

export type HomepageBuildInput = {
  greetingName: string | null;
  portfolioCount: number;
  preferredRewardLabel: string;
  preferredCategorySlug: string | null;
  offerCount: number;
  favoriteMerchantCount: number;
  favoriteCardCount: number;
  wallet: HomepageRewardWalletPreview | null;
  expiringRewards: HomepageExpiringReward[];
  milestones: HomepageMilestonePreview[];
  travel: HomepageTravelPreview | null;
  recentActivityCount: number;
  now?: Date;
};

export function resolveHomepageTimeOfDay(now = new Date()): HomepageTimeOfDay {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function formatInrCompact(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function daysRemainingUntil(iso: string, now: Date): number {
  const ms = new Date(iso).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function mapExpiringRewards(
  items: RewardWalletExpiringItem[],
  now = new Date(),
  limit = 4,
): HomepageExpiringReward[] {
  return [...items]
    .sort((a, b) => new Date(a.expiringAt).getTime() - new Date(b.expiringAt).getTime())
    .slice(0, limit)
    .map((item) => ({
      userCardId: item.userCardId,
      cardName: item.cardName,
      kind: item.kind,
      expiringAmount: item.expiringAmount,
      expiringAt: item.expiringAt,
      estimatedValueInr: item.estimatedValueInr,
      daysRemaining: daysRemainingUntil(item.expiringAt, now),
    }));
}

export function mapMilestonePreviews(
  milestones: SpendMilestoneProgress[],
  limit = 3,
): HomepageMilestonePreview[] {
  const ranked = [...milestones]
    .filter((row) => row.status !== 'ACHIEVED')
    .sort((a, b) => {
      if (b.progressPercent !== a.progressPercent) return b.progressPercent - a.progressPercent;
      return a.daysRemaining - b.daysRemaining;
    })
    .slice(0, limit);

  return ranked.map((row) => ({
    id: row.id,
    cardName: row.cardName,
    label: row.label,
    progressPercent: row.progressPercent,
    remainingSpendInr: row.remainingSpendInr,
    daysRemaining: row.daysRemaining,
    status: row.status,
  }));
}

export function mapTravelPreview(overview: TravelHubOverview | null): HomepageTravelPreview | null {
  if (!overview) return null;
  const hasTravelContext =
    overview.loungeCardCount > 0 ||
    overview.totalMiles > 0 ||
    overview.travelOfferCount > 0 ||
    overview.spending.totalVolumeInr > 0;

  return {
    loungeCardCount: overview.loungeCardCount,
    totalMiles: overview.totalMiles,
    totalMilesValueInr: overview.totalMilesValueInr,
    travelOfferCount: overview.travelOfferCount,
    recentTravelSpendInr: overview.spending.totalVolumeInr,
    periodLabel: overview.spending.periodLabel,
    hasTravelContext,
  };
}

export function buildMorningSummary(input: HomepageBuildInput): HomepageMorningSummary {
  const now = input.now ?? new Date();
  const timeOfDay = resolveHomepageTimeOfDay(now);
  const name = input.greetingName?.trim() || 'there';
  const greetingPrefix =
    timeOfDay === 'morning'
      ? 'Good morning'
      : timeOfDay === 'afternoon'
        ? 'Good afternoon'
        : 'Good evening';

  const highlights: HomepageMorningSummary['highlights'] = [];
  if (input.wallet && input.wallet.totalEstimatedValueInr > 0) {
    highlights.push({
      id: 'wallet',
      label: 'Reward wallet',
      value: formatInrCompact(input.wallet.totalEstimatedValueInr),
      actionPath: '/account/rewards',
    });
  }
  if (input.expiringRewards.length > 0) {
    const top = input.expiringRewards[0]!;
    highlights.push({
      id: 'expiring',
      label: 'Expiring soon',
      value:
        top.estimatedValueInr != null && top.estimatedValueInr > 0
          ? formatInrCompact(top.estimatedValueInr)
          : `${input.expiringRewards.length} balance${input.expiringRewards.length === 1 ? '' : 's'}`,
      actionPath: '/account/rewards',
    });
  }
  if (input.milestones.length > 0) {
    const top = input.milestones[0]!;
    highlights.push({
      id: 'milestone',
      label: 'Closest milestone',
      value: `${Math.round(top.progressPercent)}% · ${formatInrCompact(top.remainingSpendInr)} left`,
      actionPath: '/account/milestones',
    });
  }
  if (input.offerCount > 0) {
    highlights.push({
      id: 'offers',
      label: 'Matched offers',
      value: String(input.offerCount),
      actionPath: '/account/offers',
    });
  }
  if (highlights.length === 0) {
    highlights.push({
      id: 'portfolio',
      label: 'Cards in portfolio',
      value: String(input.portfolioCount),
      actionPath: '/account/cards',
    });
  }

  let headline = `Your financial orbit is aligned, ${name}`;
  if (input.expiringRewards.length > 0) {
    headline = `Rewards need attention, ${name}`;
  } else if (input.milestones.some((m) => m.progressPercent >= 70)) {
    headline = `You're close to a milestone, ${name}`;
  } else if (input.travel?.hasTravelContext) {
    headline = `Travel perks are ready, ${name}`;
  } else if (input.portfolioCount === 0) {
    headline = `Let's personalize your orbit, ${name}`;
  }

  const supportingParts = [
    `Tuned for ${input.preferredRewardLabel}`,
    `${input.portfolioCount} card${input.portfolioCount === 1 ? '' : 's'}`,
  ];
  if (input.preferredCategorySlug) {
    supportingParts.push(`${displayCategoryLabel(input.preferredCategorySlug)} spend`);
  }
  if (input.recentActivityCount > 0) {
    supportingParts.push(
      `${input.recentActivityCount} recent transaction${input.recentActivityCount === 1 ? '' : 's'}`,
    );
  }

  return {
    timeOfDay,
    greeting: `${greetingPrefix}, ${name}`,
    headline,
    supportingLine: supportingParts.join(' · '),
    highlights: highlights.slice(0, 4),
  };
}

export function buildRecommendedActions(input: HomepageBuildInput): HomepageRecommendedAction[] {
  const actions: HomepageRecommendedAction[] = [];

  if (input.portfolioCount === 0) {
    actions.push({
      id: 'add-card',
      title: 'Add your first card',
      body: 'CardOrbit personalizes recommendations after you add a card to your portfolio.',
      priority: 'high',
      actionLabel: 'Add card',
      actionPath: '/account/cards/add',
    });
  }

  const urgentExpiry = input.expiringRewards.find((row) => row.daysRemaining <= 14);
  if (urgentExpiry) {
    actions.push({
      id: 'redeem-expiring',
      title: `Redeem ${urgentExpiry.cardName} rewards`,
      body:
        urgentExpiry.estimatedValueInr != null && urgentExpiry.estimatedValueInr > 0
          ? `${formatInrCompact(urgentExpiry.estimatedValueInr)} may expire in ${urgentExpiry.daysRemaining} day${urgentExpiry.daysRemaining === 1 ? '' : 's'}.`
          : `A ${urgentExpiry.kind.toLowerCase().replaceAll('_', ' ')} balance expires in ${urgentExpiry.daysRemaining} day${urgentExpiry.daysRemaining === 1 ? '' : 's'}.`,
      priority: 'high',
      actionLabel: 'Open reward wallet',
      actionPath: '/account/rewards',
    });
  } else if (input.expiringRewards.length > 0) {
    actions.push({
      id: 'review-expiry',
      title: 'Review expiring rewards',
      body: `${input.expiringRewards.length} balance${input.expiringRewards.length === 1 ? '' : 's'} are approaching expiry.`,
      priority: 'medium',
      actionLabel: 'See expiry plan',
      actionPath: '/account/rewards',
    });
  }

  const nearMilestone = input.milestones.find((row) => row.progressPercent >= 50);
  if (nearMilestone) {
    actions.push({
      id: `milestone-${nearMilestone.id}`,
      title: `Push toward ${nearMilestone.label}`,
      body: `${formatInrCompact(nearMilestone.remainingSpendInr)} left on ${nearMilestone.cardName} · ${nearMilestone.daysRemaining} day${nearMilestone.daysRemaining === 1 ? '' : 's'} remaining.`,
      priority: nearMilestone.progressPercent >= 75 ? 'high' : 'medium',
      actionLabel: 'View milestones',
      actionPath: '/account/milestones',
    });
  }

  if (input.travel?.hasTravelContext) {
    actions.push({
      id: 'travel-hub',
      title: 'Check travel benefits',
      body:
        input.travel.loungeCardCount > 0
          ? `${input.travel.loungeCardCount} lounge-ready card${input.travel.loungeCardCount === 1 ? '' : 's'} · ${Math.round(input.travel.totalMiles).toLocaleString('en-IN')} miles tracked.`
          : `${Math.round(input.travel.totalMiles).toLocaleString('en-IN')} miles · ${input.travel.travelOfferCount} travel offer${input.travel.travelOfferCount === 1 ? '' : 's'}.`,
      priority: 'medium',
      actionLabel: 'Open travel hub',
      actionPath: '/account/travel',
    });
  }

  if (input.offerCount > 0) {
    actions.push({
      id: 'offers',
      title: 'Use a matched offer',
      body: `${input.offerCount} active offer${input.offerCount === 1 ? '' : 's'} fit your cards right now.`,
      priority: 'medium',
      actionLabel: 'Browse offers',
      actionPath: '/account/offers',
    });
  }

  if (input.preferredCategorySlug) {
    actions.push({
      id: 'quick-reco',
      title: `Best card for ${displayCategoryLabel(input.preferredCategorySlug)}`,
      body: 'Run a quick recommendation tuned to your preferred spend category.',
      priority: 'low',
      actionLabel: 'Browse merchants',
      actionPath: '/account/merchants',
    });
  } else if (input.portfolioCount > 0) {
    actions.push({
      id: 'quick-reco',
      title: 'Find the best card for your next spend',
      body: 'Ask CardOrbit which card maximizes rewards for this purchase.',
      priority: 'low',
      actionLabel: 'Browse merchants',
      actionPath: '/account/merchants',
    });
  }

  if (input.favoriteMerchantCount === 0 && input.portfolioCount > 0) {
    actions.push({
      id: 'favorite-merchants',
      title: 'Pin favorite merchants',
      body: 'Favorites surface faster on home and keep recommendations context-aware.',
      priority: 'low',
      actionLabel: 'Browse merchants',
      actionPath: '/account/merchants',
    });
  }

  const priorityRank: Record<HomepageRecommendedAction['priority'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return actions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]).slice(0, 5);
}

export function resolvePersonalizedHomepageWidgets(input: {
  portfolioCount: number;
  favoriteCardCount: number;
  offerCount: number;
  expiringCount: number;
  milestoneCount: number;
  hasTravelContext: boolean;
  recentActivityCount: number;
  favoriteMerchantCount: number;
}): DashboardWidgetId[] {
  const widgets: DashboardWidgetId[] = [
    'morning-summary',
    'recommended-actions',
    'insights',
    'recommendation',
    'savings',
    'portfolio',
    'merchants',
  ];

  if (input.expiringCount > 0) {
    widgets.splice(2, 0, 'expiring-rewards');
  }
  if (input.milestoneCount > 0) {
    widgets.splice(widgets.indexOf('savings') + 1, 0, 'milestones');
  }
  if (input.hasTravelContext) {
    const after = widgets.includes('milestones')
      ? widgets.indexOf('milestones') + 1
      : widgets.indexOf('savings') + 1;
    widgets.splice(after, 0, 'upcoming-travel');
  }
  if (input.favoriteCardCount > 0) {
    widgets.splice(widgets.indexOf('portfolio'), 0, 'favorite-cards');
  }
  if (input.offerCount > 0) {
    widgets.splice(widgets.indexOf('merchants'), 0, 'offers');
  }
  if (input.recentActivityCount > 0) {
    widgets.push('recent-activity');
  }

  if (input.portfolioCount === 0) {
    return widgets.filter((id) => id !== 'favorite-cards' && id !== 'milestones');
  }

  if (input.favoriteMerchantCount === 0 && input.recentActivityCount === 0) {
    // Keep merchants (trending) available even without favorites.
  }

  return widgets;
}

export function mapRecentActivityItems(
  items: Array<{
    id: string;
    merchantName: string;
    cardName: string;
    amountInr: number;
    categoryLabel: string | null;
    transactedAt: string;
  }>,
  limit = 5,
): HomepageRecentActivityItem[] {
  return items.slice(0, limit).map((item) => ({
    id: item.id,
    merchantName: item.merchantName,
    cardName: item.cardName,
    amountInr: item.amountInr,
    categoryLabel: item.categoryLabel,
    transactedAt: item.transactedAt,
  }));
}
