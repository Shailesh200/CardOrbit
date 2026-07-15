import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

import type { AiConfig } from '../config';

/** Non-Gemini providers use the Vercel AI SDK adapter layer. */
export function createLanguageModel(config: AiConfig, modelId: string): LanguageModel {
  switch (config.provider) {
    case 'anthropic': {
      const client = createAnthropic({ apiKey: config.apiKey });
      return client(modelId);
    }
    case 'openai': {
      const client = createOpenAI({ apiKey: config.apiKey });
      return client(modelId);
    }
    case 'gemini':
    default:
      throw new Error(
        `Provider "${config.provider}" uses @google/genai directly — do not call createLanguageModel`,
      );
  }
}
