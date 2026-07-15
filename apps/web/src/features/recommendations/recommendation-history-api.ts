import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type RecommendationFeedbackType =
  | 'USEFUL'
  | 'NOT_USEFUL'
  | 'WRONG_RECOMMENDATION'
  | 'MISSING_CARD'
  | 'INCORRECT_REWARD';

export type RecommendationHistorySummary = {
  id: string;
  amountInr: number;
  merchantSlug: string | null;
  merchantName: string | null;
  recommendedCardName: string | null;
  expectedRewardInr: number | null;
  rankingVersion: 'v1' | 'v2' | 'v3';
  source: 'WEB' | 'EXTENSION' | 'DASHBOARD';
  createdAt: string;
  feedback: { type: RecommendationFeedbackType; updatedAt: string } | null;
};

export type RecommendationHistoryDetail = RecommendationHistorySummary & {
  categorySlug: string | null;
  effectiveRatePercent: number | null;
  confidenceScore: number | null;
  explanationSource: 'ai' | 'template';
  explanation: string | null;
  alternatives: Array<{
    userCardId: string;
    creditCardId: string;
    cardName: string;
    cardSlug: string;
    bankName: string;
    rank: number;
    expectedRewardInr: number;
    effectiveRatePercent: number;
  }>;
  cardsEvaluated: number;
  feedback: {
    type: RecommendationFeedbackType;
    comment: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export function listRecommendationHistory(limit = 20) {
  return authFetch<{ items: RecommendationHistorySummary[]; total: number }>(
    `/api/v1/recommendations/history?limit=${limit}`,
    {},
    API_BASE,
  );
}

export function getRecommendationHistory(recommendationId: string) {
  return authFetch<RecommendationHistoryDetail>(
    `/api/v1/recommendations/${recommendationId}`,
    {},
    API_BASE,
  );
}

export function submitRecommendationFeedback(
  recommendationId: string,
  input: { type: RecommendationFeedbackType; comment?: string },
) {
  return authFetch<{
    recommendationId: string;
    feedback: {
      type: RecommendationFeedbackType;
      comment: string | null;
      createdAt: string;
      updatedAt: string;
    };
  }>(
    `/api/v1/recommendations/${recommendationId}/feedback`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    API_BASE,
  );
}
