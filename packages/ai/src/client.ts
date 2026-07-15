/** @deprecated Gemini is the default provider — use getGeminiClient from ./gemini/client. */
export { getGeminiClient as createAiClient, resetGeminiClient } from './gemini/client';
export { createLanguageModel } from './providers';
