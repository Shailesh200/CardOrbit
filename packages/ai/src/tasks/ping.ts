import { getGeminiClient } from '../gemini/client';
import { loadAiConfig } from '../config';
import { generatePlainText } from '../structured';
import { getPromptVersion } from '../prompts/registry';

export async function pingAi(options?: { triggeredBy?: string }): Promise<{ text: string; model: string; latencyMs: number }> {
  return generatePlainText({
    prompt: 'Say READY in one word.',
    tier: 'ping',
    maxOutputTokens: 32,
    feature: 'ping',
    promptVersion: getPromptVersion('ping'),
    triggeredBy: options?.triggeredBy,
  });
}

export async function verifyGeminiApiKey(): Promise<{ model: string }> {
  const config = loadAiConfig();
  if (config.provider !== 'gemini') {
    return { model: config.pingModel };
  }

  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: config.pingModel,
    contents: 'Reply with OK only.',
    config: { maxOutputTokens: 16 },
  });

  if (!response.text?.trim()) {
    throw new Error('Gemini API key check failed: empty response');
  }

  return { model: config.pingModel };
}
