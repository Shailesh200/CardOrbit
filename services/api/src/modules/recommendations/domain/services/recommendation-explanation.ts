import { explainRecommendation, findUngroundedAmounts, isAiConfigured } from '@cardwise/ai';
import type { RecommendationScoreBreakdown } from '@cardwise/validation';

import type {
  RankedCardRecommendation,
  RecommendationAuditEntry,
  RecommendationEngineVersion,
} from './recommendation-ranker';
import { buildRecommendationSummary } from './recommendation-ranker';

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
  rankingVersion: RecommendationEngineVersion;
};

export type RecommendationExplanationEnvelope = {
  explanation: string;
  explanationSource: 'ai' | 'template';
  shortSummary?: string;
  bulletReasons?: string[];
  calculationBreakdown: RecommendationCalculationBreakdown;
  citations: RecommendationCitation[];
  aiModel?: string;
};

export function buildRecommendationCitations(
  card: RankedCardRecommendation,
): RecommendationCitation[] {
  const citations: RecommendationCitation[] = [
    { type: 'card', id: card.cardSlug, label: card.cardName },
  ];

  if (card.ruleKey) {
    citations.push({
      type: 'rule',
      id: card.ruleKey,
      label: card.ruleName ?? card.ruleKey,
    });
  }

  for (const benefit of card.benefitsApplied.slice(0, 3)) {
    citations.push({ type: 'benefit', id: benefit, label: benefit });
  }

  return citations;
}

export function buildCalculationBreakdown(
  card: RankedCardRecommendation,
  amountInr: number,
  rankingVersion: RecommendationEngineVersion,
): RecommendationCalculationBreakdown {
  return {
    amountInr,
    recommendedCardSlug: card.cardSlug,
    recommendedCardName: card.cardName,
    expectedRewardInr: card.expectedRewardInr,
    effectiveRatePercent: card.effectiveRatePercent,
    ruleKey: card.ruleKey,
    ruleName: card.ruleName,
    scoreBreakdown: card.scoreBreakdown,
    rankingVersion,
  };
}

function buildTemplateEnvelope(
  ranked: RankedCardRecommendation[],
  amountInr: number,
  merchantName: string | undefined,
  rankingVersion: RecommendationEngineVersion,
): RecommendationExplanationEnvelope | null {
  const best = ranked[0];
  if (!best) return null;

  return {
    explanation: buildRecommendationSummary(ranked, merchantName, rankingVersion),
    explanationSource: 'template',
    calculationBreakdown: buildCalculationBreakdown(best, amountInr, rankingVersion),
    citations: buildRecommendationCitations(best),
  };
}

export async function enrichRecommendationExplanation(input: {
  ranked: RankedCardRecommendation[];
  audit: RecommendationAuditEntry[];
  amountInr: number;
  merchantName?: string;
  merchantSlug?: string;
  categorySlug?: string | null;
  rankingVersion: RecommendationEngineVersion;
  aiEnabled: boolean;
}): Promise<RecommendationExplanationEnvelope | null> {
  const template = buildTemplateEnvelope(
    input.ranked,
    input.amountInr,
    input.merchantName,
    input.rankingVersion,
  );
  if (!template) return null;

  if (!input.aiEnabled || !isAiConfigured()) {
    return template;
  }

  const best = input.ranked[0]!;
  const auditJson = JSON.stringify(input.audit);
  /** Home/showcase must not wait on slow LLM chains — fall back to template quickly. */
  const AI_EXPLAIN_BUDGET_MS = 2_500;

  try {
    const aiResult = await Promise.race([
      explainRecommendation({
        spendContext: {
          amount: input.amountInr,
          merchantSlug: input.merchantSlug,
          categorySlug: input.categorySlug,
        },
        recommendedCard: {
          cardName: best.cardName,
          cardSlug: best.cardSlug,
          expectedRewardInr: best.expectedRewardInr,
          effectiveRatePercent: best.effectiveRatePercent,
          explanation: best.explanation,
          ruleKey: best.ruleKey,
        },
        alternativeNames: input.ranked.slice(1, 4).map((row) => row.cardName),
        breakdown: template.calculationBreakdown,
        audit: input.audit,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI explanation budget exceeded')), AI_EXPLAIN_BUDGET_MS);
      }),
    ]);

    const ungrounded = findUngroundedAmounts(aiResult.data.explanation, auditJson);
    if (ungrounded.length > 0) {
      return {
        ...template,
        aiModel: aiResult.model,
      };
    }

    return {
      explanation: aiResult.data.explanation,
      explanationSource: 'ai',
      shortSummary: aiResult.data.shortSummary,
      bulletReasons: aiResult.data.bulletReasons,
      calculationBreakdown: template.calculationBreakdown,
      citations: template.citations,
      aiModel: aiResult.model,
    };
  } catch {
    return template;
  }
}

export async function isAiExplanationEnabled(distinctId = 'anonymous'): Promise<boolean> {
  const { FeatureFlag, isEnabled } = await import('@cardwise/feature-flags');
  return (
    (await isEnabled(FeatureFlag.AI_PLATFORM_ENABLED, distinctId)) &&
    (await isEnabled(FeatureFlag.AI_EXPLANATIONS_ENABLED, distinctId))
  );
}
