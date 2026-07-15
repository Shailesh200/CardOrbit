import { CATALOG_STRUCTURE_SYSTEM } from './catalog-structure';
import { RECO_EXPLAIN_SYSTEM } from './reco-explain';
import { SMART_INSIGHTS_SYSTEM } from './smart-insights';
import { RANKING_SIGNALS_SYSTEM } from './ranking-signals';
import { RAG_ANSWER_SYSTEM } from './rag-answer';
import { ASSISTANT_SYSTEM } from './assistant';

export type AiPromptRegistryEntry = {
  version: string;
  systemPrompt: string;
  modelTier: 'fast' | 'quality' | 'ping';
  description: string;
};

export const AI_PROMPT_REGISTRY = {
  ping: {
    version: 'v1.0.0',
    systemPrompt: 'You are a connectivity check. Reply briefly.',
    modelTier: 'ping',
    description: 'Gemini connectivity ping',
  },
  'catalog-structure': {
    version: 'v1.0.0',
    systemPrompt: CATALOG_STRUCTURE_SYSTEM,
    modelTier: 'fast',
    description: 'Structure issuer HTML into IngestCardBundle draft',
  },
  'reco-explain': {
    version: 'v1.0.0',
    systemPrompt: RECO_EXPLAIN_SYSTEM,
    modelTier: 'fast',
    description: 'Grounded natural-language recommendation explanation',
  },
  'smart-insights': {
    version: 'v1.0.0',
    systemPrompt: SMART_INSIGHTS_SYSTEM,
    modelTier: 'fast',
    description: 'Personalized dashboard insight narratives',
  },
  'ranking-signals': {
    version: 'v1.0.0',
    systemPrompt: RANKING_SIGNALS_SYSTEM,
    modelTier: 'fast',
    description: 'Capped preference signals for recommendation ranker',
  },
  'rag-answer': {
    version: 'v1.0.0',
    systemPrompt: RAG_ANSWER_SYSTEM,
    modelTier: 'quality',
    description: 'Grounded RAG answers over user context and retrieved catalog chunks',
  },
  assistant: {
    version: 'v1.0.0',
    systemPrompt: ASSISTANT_SYSTEM,
    modelTier: 'quality',
    description: 'Read-only conversational assistant with tool-grounded replies',
  },
} as const satisfies Record<string, AiPromptRegistryEntry>;

export type AiPromptRegistryFeature = keyof typeof AI_PROMPT_REGISTRY;

export function getPromptVersion(feature: AiPromptRegistryFeature): string {
  return AI_PROMPT_REGISTRY[feature].version;
}
