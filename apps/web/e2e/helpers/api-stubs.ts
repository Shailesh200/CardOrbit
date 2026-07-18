import type { Page, Route } from '@playwright/test';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const FEATURE_FLAGS = {
  browser_extension_enabled: true,
  ai_platform_enabled: false,
  ai_catalog_structuring_enabled: false,
  ai_explanations_enabled: false,
  ai_insights_enabled: false,
  ai_search_enabled: false,
  ai_assistant_enabled: false,
  ai_copilot_enabled: true,
  ai_knowledge_graph_enabled: false,
  ai_ranking_signals_enabled: false,
  ai_merchant_enrichment_enabled: false,
  ai_offer_parsing_enabled: false,
  ai_admin_insights_enabled: false,
  travel_booking_enabled: true,
  premium_features_enabled: false,
  onboarding_v1: true,
  portfolio_v1: true,
  recommendation_v1: true,
  recommendation_v2: true,
  recommendation_v3: true,
  dashboard_v1: true,
  personalized_homepage: true,
  advanced_notifications: true,
  financial_calendar: true,
  user_reports: true,
};

const ONBOARDING_COMPLETE = {
  status: 'COMPLETED',
  step: 'DONE',
  answers: {},
  completedAt: '2026-01-01T00:00:00.000Z',
  flagEnabled: true,
  isComplete: true,
  allowedActions: [],
};

const PROFILE = {
  id: 'user-e2e',
  email: 'e2e@cardorbit.test',
  fullName: 'E2E User',
  firstName: 'E2E',
  lastName: 'User',
  country: 'IN',
  currency: 'INR',
  locale: 'en-IN',
  timezone: 'Asia/Kolkata',
  avatarUrl: null,
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PORTFOLIO_CARD = {
  userCardId: 'uc-e2e-1',
  cardId: 'card-millennia',
  cardName: 'HDFC Millennia',
  cardSlug: 'millennia',
  bankName: 'HDFC Bank',
  bankSlug: 'hdfc',
  nickname: null,
  isFavorite: true,
  network: 'Visa',
  lastFour: '4242',
};

function portfolioRecoCard(overrides: Record<string, unknown> = {}) {
  return {
    userCardId: 'uc-e2e-1',
    cardId: 'card-millennia',
    cardName: 'HDFC Millennia',
    cardSlug: 'millennia',
    bankName: 'HDFC Bank',
    bankSlug: 'hdfc',
    score: 1,
    expectedReward: 42,
    effectiveRatePercent: 5,
    explanation: 'Earns strong dining rewards on this spend.',
    ruleKey: null,
    benefitsApplied: [],
    confidenceScore: 0.92,
    campaignApplied: false,
    milestoneCrossed: false,
    compositeScore: 42,
    scoreBreakdown: null,
    ...overrides,
  };
}

function catalogRecoCard() {
  return portfolioRecoCard({
    userCardId: 'catalog-ace',
    cardId: 'card-ace',
    cardName: 'Axis Ace',
    cardSlug: 'ace',
    bankName: 'Axis Bank',
    bankSlug: 'axis',
    expectedReward: 68,
    effectiveRatePercent: 8,
    explanation: 'Top unowned catalog pick for this merchant.',
    compositeScore: 68,
  });
}

export function catalogRecommendationPayload() {
  const recommendedCard = portfolioRecoCard();
  const catalogBest = catalogRecoCard();
  return {
    recommendationId: 'rec-e2e-1',
    amount: 850,
    merchant: { id: 'm-swiggy', name: 'Swiggy', slug: 'swiggy', logoUrl: null },
    recommendedCard,
    alternatives: [],
    explanation: 'Best card from your portfolio for this spend.',
    explanationSource: 'template' as const,
    shortSummary: '₹42 rewards expected',
    bulletReasons: [],
    calculationBreakdown: null,
    citations: [],
    cardsEvaluated: 2,
    rankingVersion: 'v3' as const,
    catalogRecommendation: {
      recommendedCard: catalogBest,
      alternatives: [],
      explanation: 'Strong catalog alternative you do not own yet.',
      explanationSource: 'template' as const,
      shortSummary: '₹68 rewards expected',
      bulletReasons: [],
      calculationBreakdown: null,
      citations: [],
      cardsEvaluated: 12,
    },
  };
}

export function dashboardSnapshotStub() {
  return {
    greetingName: 'E2E',
    personalizedHomepage: true,
    morningSummary: null,
    recommendedActions: [],
    expiringRewards: [],
    milestonesPreview: [],
    travelPreview: null,
    recentActivity: [],
    rewardWalletPreview: null,
    personalization: {
      preferredRewardType: 'cashback',
      preferredRewardLabel: 'Cashback',
      preferredCategorySlugs: [],
      spendBand: null,
      boostFavoriteCards: false,
    },
    recommendationScenario: {
      merchantSlug: 'swiggy',
      categorySlug: 'dining',
      amount: 850,
    },
    insights: [],
    favoriteCards: [PORTFOLIO_CARD],
    recentCards: [PORTFOLIO_CARD],
    portfolioPreview: [PORTFOLIO_CARD],
    portfolioCount: 1,
    trendingMerchants: [],
    favoriteMerchants: [],
    offers: [],
    widgets: ['recommendation'],
    preferences: {
      widgetOrder: ['recommendation'],
      hiddenWidgets: [],
    },
  };
}

async function fulfillJson(route: Route, body: Json, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export type ApiStubMode = 'happy' | 'session401';

/**
 * Catch-all `/api/**` stub for authenticated account flows.
 * `session401` returns Unauthorized JSON for every API call.
 */
export async function stubConsumerApi(page: Page, mode: ApiStubMode = 'happy'): Promise<void> {
  await page.route('**/api/**', async (route) => {
    if (mode === 'session401') {
      await fulfillJson(
        route,
        { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
        401,
      );
      return;
    }

    const { pathname } = new URL(route.request().url());
    const method = route.request().method().toUpperCase();

    if (pathname === '/api/v1/features') {
      await fulfillJson(route, {
        version: 1,
        distinctId: 'e2e',
        flags: FEATURE_FLAGS,
      });
      return;
    }

    // Must include creditCards/banks/merchants maps — MiniCreditCard indexes them.
    if (pathname === '/api/v1/assets/brands') {
      await fulfillJson(route, {
        banks: {},
        merchants: {},
        creditCards: {},
      });
      return;
    }

    if (pathname === '/api/v1/onboarding') {
      await fulfillJson(route, ONBOARDING_COMPLETE);
      return;
    }

    if (pathname === '/api/v1/users/me') {
      await fulfillJson(route, PROFILE);
      return;
    }

    if (pathname === '/api/v1/users/me/notifications') {
      await fulfillJson(route, {
        emailMarketing: false,
        emailProduct: true,
        emailSecurity: true,
        inAppContextual: true,
      });
      return;
    }

    if (pathname === '/api/v1/users/me/privacy') {
      await fulfillJson(route, {
        shareAnonymousAnalytics: false,
        personalizedOffers: true,
      });
      return;
    }

    if (pathname === '/api/v1/users/me/personalization') {
      await fulfillJson(route, {
        version: 2,
        preferredRewardType: 'cashback',
        preferredBankSlugs: [],
        preferredCategorySlugs: [],
        boostFavoriteCards: false,
        preferredCurrency: 'INR',
      });
      return;
    }

    if (pathname === '/api/v1/dashboard') {
      await fulfillJson(route, dashboardSnapshotStub());
      return;
    }

    if (pathname === '/api/v1/user-cards') {
      await fulfillJson(route, [PORTFOLIO_CARD]);
      return;
    }

    if (pathname === '/api/v1/recommendations/best-card' && method === 'POST') {
      await fulfillJson(route, catalogRecommendationPayload());
      return;
    }

    if (pathname === '/api/v1/recommendations/showcase') {
      await fulfillJson(route, catalogRecommendationPayload());
      return;
    }

    if (pathname.startsWith('/api/v1/offers')) {
      await fulfillJson(route, { items: [], total: 0, page: 1, pageSize: 20 });
      return;
    }

    if (pathname.startsWith('/api/v1/merchants')) {
      await fulfillJson(route, { items: [], total: 0, page: 1, pageSize: 20 });
      return;
    }

    if (pathname.startsWith('/api/v1/notifications')) {
      await fulfillJson(route, { items: [], unreadCount: 0 });
      return;
    }

    if (pathname.startsWith('/api/v1/transactions')) {
      await fulfillJson(route, { items: [], total: 0 });
      return;
    }

    if (pathname.startsWith('/api/v1/mail-sync')) {
      await fulfillJson(route, { mailboxes: [] });
      return;
    }

    // Default: empty success so unknown account fetches do not hang or leak.
    if (method === 'GET' || method === 'HEAD') {
      await fulfillJson(route, {});
      return;
    }

    await fulfillJson(route, { ok: true });
  });
}
