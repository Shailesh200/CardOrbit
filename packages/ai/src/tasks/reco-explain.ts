import { RecoExplanationSchema, type RecoExplanation } from '@cardwise/validation';

import { findUngroundedAmounts } from '../eval/safety';
import { buildRecoExplainPrompt, RECO_EXPLAIN_SYSTEM } from '../prompts/reco-explain';
import { getPromptVersion } from '../prompts/registry';
import { generatePlainText, generateStructured, type StructuredResult } from '../structured';

function proseFallbackFromAudit(
  text: string,
  recommendedCard: Record<string, unknown>,
): RecoExplanation {
  const cardName = String(recommendedCard.cardName ?? 'Recommended card');
  const reward = recommendedCard.expectedRewardInr;
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim() || text.trim();
  return RecoExplanationSchema.parse({
    explanation: text.trim() || `Use ${cardName} for this transaction based on CardOrbit rules.`,
    shortSummary: firstSentence.slice(0, 120),
    bulletReasons: [
      reward != null ? `${cardName} expected reward: ₹${reward}` : `${cardName} ranked highest by the engine`,
    ],
  });
}

export async function explainRecommendation(input: {
  spendContext: Record<string, unknown>;
  recommendedCard: Record<string, unknown>;
  alternativeNames: string[];
  breakdown: Record<string, unknown>;
  audit: unknown[];
}): Promise<StructuredResult<RecoExplanation>> {
  const prompt = buildRecoExplainPrompt(input);

  try {
    return await generateStructured({
      schema: RecoExplanationSchema,
      system: RECO_EXPLAIN_SYSTEM,
      prompt,
      tier: 'fast',
      maxOutputTokens: 512,
      feature: 'reco-explain',
      promptVersion: getPromptVersion('reco-explain'),
    });
  } catch {
    // One prose attempt only — chaining multiple LLM calls made home/showcase hang for 30–75s.
    const prose = await generatePlainText({
      system: RECO_EXPLAIN_SYSTEM,
      prompt: `${prompt}\n\nWrite 2-4 sentences explaining the recommendation in plain English. No JSON.`,
      tier: 'fast',
      maxOutputTokens: 400,
      feature: 'reco-explain',
      promptVersion: getPromptVersion('reco-explain'),
    });

    return {
      data: proseFallbackFromAudit(prose.text, input.recommendedCard),
      model: `${prose.model} (prose-fallback)`,
      latencyMs: prose.latencyMs,
    };
  }
}

export { findUngroundedAmounts } from '../eval/safety';
