import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type RecommendationScoreBreakdown = {
  rewardInr: number;
  merchantBonusInr: number;
  preferenceBonusInr: number;
  promotionBonusInr: number;
  strategicMilestoneBonusInr?: number;
  strategicExpiryBonusInr?: number;
  strategicTravelBonusInr?: number;
  compositeInr: number;
};

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
  confidenceScore: number;
  campaignApplied: boolean;
  milestoneCrossed: boolean;
  compositeScore: number;
  scoreBreakdown: RecommendationScoreBreakdown | null;
  strategicRationale?: string | null;
};

export type RecommendationCitation = {
  type: 'rule' | 'benefit' | 'card';
  id: string;
  label?: string;
};

export type RecommendationCalculationBreakdown = {
  amountInr: number;
  recommendedCardSlug: string;
  recommendedCardName: string;
  expectedRewardInr: number;
  effectiveRatePercent: number;
  ruleKey: string | null;
  ruleName: string | null;
  scoreBreakdown: RecommendationScoreBreakdown | null;
  rankingVersion: 'v1' | 'v2' | 'v3';
};

export type CatalogRecommendation = {
  recommendedCard: RecommendationCard | null;
  alternatives: RecommendationCard[];
  explanation: string;
  explanationSource?: 'ai' | 'template';
  shortSummary?: string;
  bulletReasons?: string[];
  calculationBreakdown?: RecommendationCalculationBreakdown | null;
  citations?: RecommendationCitation[];
  cardsEvaluated: number;
};

export type LiveRecommendation = {
  source: 'showcase' | 'portfolio';
  recommendationId: string;
  amount: number;
  merchant: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
  recommendedCard: RecommendationCard | null;
  alternatives: RecommendationCard[];
  explanation: string;
  explanationSource: 'ai' | 'template';
  shortSummary?: string;
  bulletReasons?: string[];
  calculationBreakdown: RecommendationCalculationBreakdown | null;
  citations: RecommendationCitation[];
  aiModel?: string;
  cardsEvaluated: number;
  rankingVersion: 'v1' | 'v2' | 'v3';
  /** Unowned catalog picks ranked for the same merchant + amount (portfolio best-card only). */
  catalogRecommendation: CatalogRecommendation | null;
};

export const LIVE_RECOMMENDATION_SCENARIO = {
  amount: 850,
  merchantSlug: 'swiggy',
  categorySlug: 'dining',
} as const;

export async function fetchRecommendationShowcase(): Promise<LiveRecommendation> {
  const response = await fetch(`${API_BASE}/api/v1/recommendations/showcase`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Showcase recommendation unavailable');
  }

  const payload = (await response.json()) as Omit<LiveRecommendation, 'source'>;
  return {
    ...payload,
    source: 'showcase',
    explanationSource: payload.explanationSource ?? 'template',
    citations: payload.citations ?? [],
    calculationBreakdown: payload.calculationBreakdown ?? null,
    catalogRecommendation: payload.catalogRecommendation ?? null,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Recommendation request timed out')), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function fetchBestCardRecommendation(input: {
  merchantSlug?: string;
  merchantId?: string;
  categorySlug?: string | null;
  amount: number;
}): Promise<LiveRecommendation> {
  const result = await authFetch<Omit<LiveRecommendation, 'source'>>(
    '/api/v1/recommendations/best-card',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: input.amount,
        merchantSlug: input.merchantSlug,
        merchantId: input.merchantId,
        categorySlug: input.categorySlug ?? undefined,
      }),
    },
    API_BASE,
  );

  return {
    ...result,
    source: 'portfolio' as const,
    explanationSource: result.explanationSource ?? 'template',
    citations: result.citations ?? [],
    calculationBreakdown: result.calculationBreakdown ?? null,
    catalogRecommendation: result.catalogRecommendation ?? null,
  };
}

export async function fetchPortfolioRecommendation(): Promise<LiveRecommendation> {
  return fetchBestCardRecommendation(LIVE_RECOMMENDATION_SCENARIO);
}

export async function fetchLiveRecommendation(
  preferPortfolio: boolean,
): Promise<LiveRecommendation> {
  // After API restarts, portfolio calls can hang — time out so we still show showcase/demo.
  if (preferPortfolio) {
    try {
      return await withTimeout(fetchPortfolioRecommendation(), 3_500);
    } catch {
      // Fall back to public showcase when portfolio is empty, slow, or API is warming up.
    }
  }

  return withTimeout(fetchRecommendationShowcase(), 5_000);
}

export function formatRewardHighlight(recommendation: {
  recommendedCard: RecommendationCard | null;
  shortSummary?: string;
}): string {
  if (recommendation.shortSummary?.trim()) {
    return recommendation.shortSummary.trim();
  }

  const card = recommendation.recommendedCard;
  if (!card) return 'No eligible card rewards for this spend';

  if (card.benefitsApplied.length > 0) {
    return card.benefitsApplied[0] ?? card.explanation;
  }

  return card.explanation;
}

/** Deep-link into Add card with catalog slug/name prefilled when available. */
export function addCardHref(
  card?: Pick<RecommendationCard, 'cardSlug' | 'cardName'> | null,
): string {
  if (!card) return '/account/cards/add';
  const q = card.cardSlug || card.cardName;
  return `/account/cards/add?q=${encodeURIComponent(q)}`;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
