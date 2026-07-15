export { loadAiConfig, isAiConfigured, type AiConfig, type AiProviderKind, EMBEDDING_DIMENSION } from './config';
export { createLanguageModel } from './providers';
export { getGeminiClient, resetGeminiClient } from './gemini/client';
export {
  geminiGeneratePlainText,
  geminiGeneratePlainTextStream,
  geminiGenerateStructured,
} from './gemini/generate';
export { embedText, embedTexts, type EmbeddingUsage } from './gemini/embed';
export {
  generateStructured,
  generatePlainText,
  resolveModelId,
  type StructuredResult,
  type ModelTier,
} from './structured';
export { setAiRunLogger, buildAiRunLog, emitAiRun, type AiRunLogger } from './run-logger';
export { AI_CONSTITUTION } from './prompts/constitution';
export { AI_PROMPT_REGISTRY, getPromptVersion, type AiPromptRegistryFeature } from './prompts/registry';
export { pingAi, verifyGeminiApiKey } from './tasks/ping';
export { structureCardBundleFromPage, truncateHtmlForPrompt } from './tasks/catalog-structure';
export { explainRecommendation, findUngroundedAmounts } from './tasks/reco-explain';
export { generateSmartInsights } from './tasks/smart-insights';
export { generateRankingSignals } from './tasks/ranking-signals';
export { generateRagAnswer } from './tasks/rag-answer';
export { classifyAssistantIntent, generateAssistantTurn } from './tasks/assistant-turn';
export { RecoExplanationSchema, type RecoExplanation } from '@cardwise/validation';
export {
  findHallucinatedMultipliers,
  validateRecoExplanationSafety,
  validateCatalogBundleSafety,
} from './eval/safety';

/** @deprecated Use getGeminiClient */
export { getGeminiClient as createAiClient } from './gemini/client';
