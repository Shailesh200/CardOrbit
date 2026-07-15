import { SmartInsightsOutputSchema, type SmartInsightsContext } from '@cardwise/validation';

import { buildSmartInsightsPrompt, SMART_INSIGHTS_SYSTEM } from '../prompts/smart-insights';
import { getPromptVersion } from '../prompts/registry';
import { generateStructured, type StructuredResult } from '../structured';

export async function generateSmartInsights(
  context: SmartInsightsContext,
): Promise<StructuredResult<{ insights: Array<{ id: string; title: string; body: string; actionLabel?: string; actionPath?: string }> }>> {
  const prompt = buildSmartInsightsPrompt(context);

  return generateStructured({
    schema: SmartInsightsOutputSchema,
    system: SMART_INSIGHTS_SYSTEM,
    prompt,
    tier: 'fast',
    maxOutputTokens: 768,
    feature: 'smart-insights',
    promptVersion: getPromptVersion('smart-insights'),
  });
}
