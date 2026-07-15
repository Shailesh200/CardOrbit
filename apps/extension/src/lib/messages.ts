export type RecommendationCard = {
  userCardId: string;
  cardId: string;
  cardName: string;
  cardSlug: string;
  bankName: string;
  bankSlug: string;
  score: number;
  expectedReward: number;
  effectiveRatePercent: number;
  explanation: string;
  ruleKey: string | null;
  benefitsApplied: string[];
};

export type LiveRecommendation = {
  source: 'showcase' | 'portfolio';
  recommendationId: string;
  amount: number;
  merchant: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
  recommendedCard: RecommendationCard | null;
  alternatives: RecommendationCard[];
  explanation: string;
  cardsEvaluated: number;
  catalogRecommendation: CatalogRecommendation | null;
};

export type CatalogRecommendation = {
  recommendedCard: RecommendationCard | null;
  alternatives: RecommendationCard[];
  explanation: string;
  cardsEvaluated: number;
};

export type TabContext = {
  tabId: number | null;
  url: string | null;
  merchantSlug: string | null;
  merchantHostname: string | null;
};

export type PopupRecommendationResponse =
  | { status: 'disabled'; message: string }
  | { status: 'unauthenticated' }
  | { status: 'no-merchant'; tab: TabContext }
  | { status: 'ready'; tab: TabContext; recommendation: LiveRecommendation }
  | { status: 'error'; tab: TabContext; message: string };

export type ExtensionMatchedOfferPreview = {
  title: string;
  cashbackPercent: string | null;
  bestEstimatedSavingsInr: number | null;
  isEligible: boolean;
};

export type OverlayRecommendationResponse =
  | { status: 'disabled'; message: string }
  | { status: 'unauthenticated' }
  | { status: 'no-merchant' }
  | {
      status: 'ready';
      recommendationId: string;
      merchantSlug: string;
      merchantName: string;
      amount: number;
      amountDetected: boolean;
      recommendation: LiveRecommendation;
      topOffer: ExtensionMatchedOfferPreview | null;
    }
  | { status: 'error'; message: string };

export const ExtensionMessage = {
  GET_POPUP_STATE: 'cardwise/get-popup-state',
  GET_OVERLAY_STATE: 'cardwise/get-overlay-state',
  SET_OVERLAY_COLLAPSED: 'cardwise/set-overlay-collapsed',
  SUBMIT_RECOMMENDATION_FEEDBACK: 'cardwise/submit-recommendation-feedback',
  LOGIN: 'cardwise/login',
  LOGOUT: 'cardwise/logout',
} as const;

export type ExtensionLoginRequest = {
  type: typeof ExtensionMessage.LOGIN;
  email: string;
  password: string;
};

export type ExtensionLoginResponse =
  | { ok: true; email: string }
  | { ok: false; message: string };

export type ExtensionLogoutRequest = {
  type: typeof ExtensionMessage.LOGOUT;
};

export type ExtensionGetPopupStateRequest = {
  type: typeof ExtensionMessage.GET_POPUP_STATE;
  amount?: number;
};

export type ExtensionGetOverlayStateRequest = {
  type: typeof ExtensionMessage.GET_OVERLAY_STATE;
  url: string;
  merchantSlug: string;
  amount?: number;
};

export type ExtensionSetOverlayCollapsedRequest = {
  type: typeof ExtensionMessage.SET_OVERLAY_COLLAPSED;
  collapsed: boolean;
};

export type ExtensionSubmitRecommendationFeedbackRequest = {
  type: typeof ExtensionMessage.SUBMIT_RECOMMENDATION_FEEDBACK;
  recommendationId: string;
  feedbackType: 'USEFUL' | 'NOT_USEFUL';
};

export const DEFAULT_RECOMMENDATION_AMOUNT = 1000;

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRewardHighlight(recommendation: {
  recommendedCard: RecommendationCard | null;
}): string {
  const card = recommendation.recommendedCard;
  if (!card) return 'No eligible card rewards for this spend';
  if (card.benefitsApplied.length > 0) {
    return card.benefitsApplied[0] ?? card.explanation;
  }
  return card.explanation;
}
