import type { RecommendationsService } from '../recommendations.service';

type RankedCard = NonNullable<
  Awaited<ReturnType<RecommendationsService['recommendBestCard']>>['recommendedCard']
>;

export function toRecommendationCardResponse(card: RankedCard) {
  return {
    userCardId: card.userCardId,
    cardId: card.creditCardId,
    cardName: card.cardName,
    cardSlug: card.cardSlug,
    bankName: card.bankName,
    bankSlug: card.bankSlug,
    score: card.score,
    expectedReward: card.expectedRewardInr,
    effectiveRatePercent: card.effectiveRatePercent,
    explanation: card.explanation,
    ruleKey: card.ruleKey,
    benefitsApplied: card.benefitsApplied,
    confidenceScore: card.confidenceScore,
    campaignApplied: card.campaignApplied,
    milestoneCrossed: card.milestoneCrossed,
    compositeScore: card.compositeScoreInr,
    scoreBreakdown: card.scoreBreakdown,
    strategicRationale: card.strategicRationale,
  };
}
