import {
  AssistantIntentOutputSchema,
  AssistantTurnOutputSchema,
  type AssistantIntentOutput,
  type AssistantTurnOutput,
  type UserAiContext,
} from '@cardwise/validation';

import {
  ASSISTANT_SYSTEM,
  COPILOT_SYSTEM,
  buildAssistantIntentPrompt,
  buildAssistantTurnPrompt,
} from '../prompts/assistant';
import { getPromptVersion } from '../prompts/registry';
import { generateStructured, type StructuredResult } from '../structured';

export async function classifyAssistantIntent(input: {
  message: string;
  history: Array<{ role: string; content: string }>;
  userContext: UserAiContext;
  copilot?: boolean;
}): Promise<StructuredResult<AssistantIntentOutput>> {
  const prompt = buildAssistantIntentPrompt({
    message: input.message,
    history: input.history,
    userContext: input.userContext,
    copilot: input.copilot,
  });

  return generateStructured({
    schema: AssistantIntentOutputSchema,
    system: input.copilot ? COPILOT_SYSTEM : ASSISTANT_SYSTEM,
    prompt,
    tier: 'fast',
    maxOutputTokens: 256,
    feature: 'assistant',
    promptVersion: getPromptVersion('assistant'),
  });
}

export async function generateAssistantTurn(input: {
  message: string;
  history: Array<{ role: string; content: string }>;
  userContext: UserAiContext;
  toolsUsed: string[];
  toolResults: Record<string, unknown>;
  copilot?: boolean;
}): Promise<StructuredResult<AssistantTurnOutput>> {
  const prompt = buildAssistantTurnPrompt({
    message: input.message,
    history: input.history,
    userContext: input.userContext,
    toolsUsed: input.toolsUsed,
    toolResults: input.toolResults,
  });

  return generateStructured({
    schema: AssistantTurnOutputSchema,
    system: input.copilot ? COPILOT_SYSTEM : ASSISTANT_SYSTEM,
    prompt,
    tier: 'quality',
    maxOutputTokens: 768,
    feature: 'assistant',
    promptVersion: getPromptVersion('assistant'),
  });
}
