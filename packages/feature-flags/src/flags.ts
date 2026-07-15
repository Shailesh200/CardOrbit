/**
 * Phase 0+ feature flag keys.
 * Defaults apply when PostHog is unavailable or returns no value.
 */
export const FeatureFlag = {
  BROWSER_EXTENSION_ENABLED: 'browser_extension_enabled',
  AI_PLATFORM_ENABLED: 'ai_platform_enabled',
  AI_CATALOG_STRUCTURING_ENABLED: 'ai_catalog_structuring_enabled',
  AI_EXPLANATIONS_ENABLED: 'ai_explanations_enabled',
  AI_INSIGHTS_ENABLED: 'ai_insights_enabled',
  AI_SEARCH_ENABLED: 'ai_search_enabled',
  AI_ASSISTANT_ENABLED: 'ai_assistant_enabled',
  AI_COPILOT_ENABLED: 'ai_copilot_enabled',
  AI_KNOWLEDGE_GRAPH_ENABLED: 'ai_knowledge_graph_enabled',
  AI_RANKING_SIGNALS_ENABLED: 'ai_ranking_signals_enabled',
  AI_MERCHANT_ENRICHMENT_ENABLED: 'ai_merchant_enrichment_enabled',
  AI_OFFER_PARSING_ENABLED: 'ai_offer_parsing_enabled',
  AI_ADMIN_INSIGHTS_ENABLED: 'ai_admin_insights_enabled',
  TRAVEL_BOOKING_ENABLED: 'travel_booking_enabled',
  PREMIUM_FEATURES_ENABLED: 'premium_features_enabled',
  ONBOARDING_V1: 'onboarding_v1',
  PORTFOLIO_V1: 'portfolio_v1',
  RECOMMENDATION_V1: 'recommendation_v1',
  RECOMMENDATION_V2: 'recommendation_v2',
  RECOMMENDATION_V3: 'recommendation_v3',
  DASHBOARD_V1: 'dashboard_v1',
  PERSONALIZED_HOMEPAGE: 'personalized_homepage',
  ADVANCED_NOTIFICATIONS: 'advanced_notifications',
  FINANCIAL_CALENDAR: 'financial_calendar',
  USER_REPORTS: 'user_reports',
} as const;

export type FeatureFlagKey = (typeof FeatureFlag)[keyof typeof FeatureFlag];

/** Environment-aware defaults for Phase 0 (local/development rollout). */
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  browser_extension_enabled: true,
  ai_platform_enabled: false,
  ai_catalog_structuring_enabled: false,
  ai_explanations_enabled: false,
  ai_insights_enabled: false,
  ai_search_enabled: false,
  ai_assistant_enabled: false,
  ai_copilot_enabled: true,
  ai_knowledge_graph_enabled: false,
  ai_ranking_signals_enabled: false,
  ai_merchant_enrichment_enabled: false,
  ai_offer_parsing_enabled: false,
  ai_admin_insights_enabled: false,
  travel_booking_enabled: true,
  premium_features_enabled: false,
  onboarding_v1: true,
  portfolio_v1: true,
  recommendation_v1: true,
  recommendation_v2: true,
  recommendation_v3: true,
  dashboard_v1: true,
  personalized_homepage: true,
  advanced_notifications: true,
  financial_calendar: true,
  user_reports: true,
};

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return Object.values(FeatureFlag).includes(value as FeatureFlagKey);
}
