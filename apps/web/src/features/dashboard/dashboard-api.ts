import { authFetch } from '@cardwise/auth';

import type { MerchantListItem } from '../merchants/merchants-api';
import type { PortfolioCardSummary } from '../portfolio/portfolio-api';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type DashboardWidgetId =
  | 'morning-summary'
  | 'recommended-actions'
  | 'expiring-rewards'
  | 'insights'
  | 'recommendation'
  | 'savings'
  | 'milestones'
  | 'upcoming-travel'
  | 'favorite-cards'
  | 'portfolio'
  | 'offers'
  | 'merchants'
  | 'recent-activity';

export type DashboardPreferences = {
  widgetOrder: DashboardWidgetId[];
  hiddenWidgets: DashboardWidgetId[];
  updatedAt?: string;
};

export type DashboardInsight = {
  id: string;
  title: string;
  body: string;
  source?: 'ai' | 'template';
  actionLabel?: string;
  actionPath?: string;
};

export type DashboardOfferPreview = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cashbackPercent: string | null;
  validUntil: string | null;
  isEligible: boolean;
  bestEstimatedSavingsInr: number | null;
  merchantName: string | null;
};

export type DashboardRecommendationScenario = {
  merchantSlug: string;
  categorySlug: string;
  amount: number;
};

export type HomepageMorningSummary = {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  greeting: string;
  headline: string;
  supportingLine: string;
  highlights: Array<{ id: string; label: string; value: string; actionPath?: string }>;
};

export type HomepageRecommendedAction = {
  id: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionPath: string;
};

export type HomepageExpiringReward = {
  userCardId: string;
  cardName: string;
  kind: 'POINTS' | 'CASHBACK' | 'MILES' | 'HOTEL_POINTS';
  expiringAmount: number;
  expiringAt: string;
  estimatedValueInr: number | null;
  daysRemaining: number;
};

export type HomepageMilestonePreview = {
  id: string;
  cardName: string;
  label: string;
  progressPercent: number;
  remainingSpendInr: number;
  daysRemaining: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED';
};

export type HomepageTravelPreview = {
  loungeCardCount: number;
  totalMiles: number;
  totalMilesValueInr: number;
  travelOfferCount: number;
  recentTravelSpendInr: number;
  periodLabel: string;
  hasTravelContext: boolean;
};

export type HomepageRecentActivityItem = {
  id: string;
  merchantName: string;
  cardName: string;
  amountInr: number;
  categoryLabel: string | null;
  transactedAt: string;
};

export type HomepageRewardWalletPreview = {
  cardCount: number;
  totalEstimatedValueInr: number;
  expiringSoonCount: number;
};

export type DashboardSnapshot = {
  greetingName: string | null;
  personalizedHomepage: boolean;
  morningSummary: HomepageMorningSummary | null;
  recommendedActions: HomepageRecommendedAction[];
  expiringRewards: HomepageExpiringReward[];
  milestonesPreview: HomepageMilestonePreview[];
  travelPreview: HomepageTravelPreview | null;
  recentActivity: HomepageRecentActivityItem[];
  rewardWalletPreview: HomepageRewardWalletPreview | null;
  personalization: {
    preferredRewardType: string;
    preferredRewardLabel: string;
    preferredCategorySlugs: string[];
    spendBand: string | null;
    boostFavoriteCards: boolean;
  };
  recommendationScenario: DashboardRecommendationScenario;
  insights: DashboardInsight[];
  favoriteCards: PortfolioCardSummary[];
  recentCards: PortfolioCardSummary[];
  portfolioPreview: PortfolioCardSummary[];
  portfolioCount: number;
  trendingMerchants: MerchantListItem[];
  favoriteMerchants: MerchantListItem[];
  offers: DashboardOfferPreview[];
  widgets: DashboardWidgetId[];
  preferences: DashboardPreferences;
};

export function getDashboardSnapshot() {
  return authFetch<DashboardSnapshot>('/api/v1/dashboard', {}, API_BASE);
}

export function getDashboardPreferences() {
  return authFetch<DashboardPreferences>('/api/v1/dashboard/preferences', {}, API_BASE);
}

export function updateDashboardPreferences(body: Partial<DashboardPreferences>) {
  return authFetch<DashboardPreferences>(
    '/api/v1/dashboard/preferences',
    { method: 'PUT', body: JSON.stringify(body) },
    API_BASE,
  );
}

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  'morning-summary': 'Morning summary',
  'recommended-actions': 'Recommended actions',
  'expiring-rewards': 'Expiring rewards',
  insights: 'Personalized insights',
  recommendation: 'Quick recommendation',
  savings: 'Reward wallet',
  milestones: 'Milestones',
  'upcoming-travel': 'Travel overview',
  'favorite-cards': 'Favorite cards',
  portfolio: 'Your cards',
  offers: 'Active offers',
  merchants: 'Merchants',
  'recent-activity': 'Recent activity',
};

export function formatHomepageInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
