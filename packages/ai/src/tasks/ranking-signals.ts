import { RankingSignalsOutputSchema, type RankingSignalsContext } from '@cardwise/validation';

import { buildRankingSignalsPrompt, RANKING_SIGNALS_SYSTEM } from '../prompts/ranking-signals';
import { getPromptVersion } from '../prompts/registry';
import { generateStructured, type StructuredResult } from '../structured';

export async function generateRankingSignals(
  context: RankingSignalsContext,
): Promise<StructuredResult<{ preferredBankSlugs?: string[]; boostFavoriteCards?: boolean; preferredRewardType?: 'cashback' | 'points' | 'any'; preferenceWeight: number }>> {
  const prompt = buildRankingSignalsPrompt(context);

  return generateStructured({
    schema: RankingSignalsOutputSchema,
    system: RANKING_SIGNALS_SYSTEM,
    prompt,
    tier: 'fast',
    maxOutputTokens: 512,
    feature: 'ranking-signals',
    promptVersion: getPromptVersion('ranking-signals'),
  });
}
