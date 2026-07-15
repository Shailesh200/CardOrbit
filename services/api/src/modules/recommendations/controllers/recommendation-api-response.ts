import type {
  BestCardRecommendationResult,
  CatalogRecommendationSlice,
} from '../recommendations.service';
import { toRecommendationCardResponse } from './recommendation-response';

export function toBestCardRecommendationResponse(result: BestCardRecommendationResult) {
  return {
    recommendationId: result.recommendationId,
    amount: result.amount,
    merchant: result.merchant
      ? {
          id: result.merchant.id,
          name: result.merchant.name,
          slug: result.merchant.slug,
          logoUrl: result.merchant.logoUrl,
        }
      : null,
    recommendedCard: result.recommendedCard
      ? toRecommendationCardResponse(result.recommendedCard)
      : null,
    alternatives: result.alternatives.map(toRecommendationCardResponse),
    explanation: result.explanation,
    explanationSource: result.explanationSource,
    shortSummary: result.shortSummary,
    bulletReasons: result.bulletReasons,
    calculationBreakdown: result.calculationBreakdown,
    citations: result.citations,
    aiModel: result.aiModel,
    cardsEvaluated: result.cardsEvaluated,
    rankingVersion: result.rankingVersion,
    catalogRecommendation: result.catalogRecommendation
      ? toCatalogRecommendationResponse(result.catalogRecommendation)
      : null,
  };
}

export function toCatalogRecommendationResponse(slice: CatalogRecommendationSlice) {
  return {
    recommendedCard: slice.recommendedCard
      ? toRecommendationCardResponse(slice.recommendedCard)
      : null,
    alternatives: slice.alternatives.map(toRecommendationCardResponse),
    explanation: slice.explanation,
    explanationSource: slice.explanationSource,
    shortSummary: slice.shortSummary,
    bulletReasons: slice.bulletReasons,
    calculationBreakdown: slice.calculationBreakdown,
    citations: slice.citations,
    cardsEvaluated: slice.cardsEvaluated,
  };
}
