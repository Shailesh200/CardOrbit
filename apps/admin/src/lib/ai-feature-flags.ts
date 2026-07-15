/** AI feature flags in dependency-friendly order (platform master first). */
export const AI_FEATURE_FLAG_KEYS = [
  'ai_platform_enabled',
  'ai_catalog_structuring_enabled',
  'ai_explanations_enabled',
  'ai_insights_enabled',
  'ai_search_enabled',
  'ai_assistant_enabled',
  'ai_copilot_enabled',
  'ai_knowledge_graph_enabled',
  'ai_ranking_signals_enabled',
  'ai_merchant_enrichment_enabled',
  'ai_offer_parsing_enabled',
  'ai_admin_insights_enabled',
] as const;

export type AiFeatureFlagKey = (typeof AI_FEATURE_FLAG_KEYS)[number];

export const AI_FEATURE_FLAG_LABELS: Record<AiFeatureFlagKey, string> = {
  ai_platform_enabled: 'Platform master',
  ai_catalog_structuring_enabled: 'Catalog structuring',
  ai_explanations_enabled: 'Recommendation explanations',
  ai_insights_enabled: 'Smart insights',
  ai_search_enabled: 'Semantic search',
  ai_assistant_enabled: 'Read-only assistant',
  ai_copilot_enabled: 'Financial Copilot',
  ai_knowledge_graph_enabled: 'Knowledge graph',
  ai_ranking_signals_enabled: 'Ranking signals',
  ai_merchant_enrichment_enabled: 'Merchant enrichment',
  ai_offer_parsing_enabled: 'Offer parsing',
  ai_admin_insights_enabled: 'Admin insights',
};

export const AI_FEATURE_FLAG_HINTS: Record<AiFeatureFlagKey, string> = {
  ai_platform_enabled: 'Master gate — required for all AI features',
  ai_catalog_structuring_enabled: 'AI-003 catalog ingest structuring',
  ai_explanations_enabled: 'AI-004 grounded reco explanations',
  ai_insights_enabled: 'AI-006 dashboard insight narratives',
  ai_search_enabled: 'AI-008 /search/ai semantic catalog search',
  ai_assistant_enabled: 'AI-009 RAG + AI-011 chat assistant',
  ai_copilot_enabled: 'M-066 Financial Copilot — expanded tools + confirmable proposals',
  ai_knowledge_graph_enabled: 'AI-010 entity graph for cards ↔ merchants ↔ offers',
  ai_ranking_signals_enabled: 'AI-007 capped preference signals',
  ai_merchant_enrichment_enabled: 'Future merchant AI enrichment',
  ai_offer_parsing_enabled: 'Future offer parsing',
  ai_admin_insights_enabled: 'Admin insights AI narratives',
};

export function isAiFeatureFlagKey(key: string): key is AiFeatureFlagKey {
  return (AI_FEATURE_FLAG_KEYS as readonly string[]).includes(key);
}

export function aiFeatureFlagLabel(key: string): string {
  if (isAiFeatureFlagKey(key)) return AI_FEATURE_FLAG_LABELS[key];
  return key.replace(/_/g, ' ');
}
