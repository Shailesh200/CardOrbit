import { FeatureFlag, useFeatureFlag } from '@cardwise/feature-flags/browser';

/** Evaluated AI feature flags from the admin portal (cached via /api/v1/features). */
export function useAiFeatures() {
  const platform = useFeatureFlag(FeatureFlag.AI_PLATFORM_ENABLED);
  const search = useFeatureFlag(FeatureFlag.AI_SEARCH_ENABLED);
  const explanations = useFeatureFlag(FeatureFlag.AI_EXPLANATIONS_ENABLED);
  const insights = useFeatureFlag(FeatureFlag.AI_INSIGHTS_ENABLED);
  const assistantFlag = useFeatureFlag(FeatureFlag.AI_ASSISTANT_ENABLED);
  const copilotFlag = useFeatureFlag(FeatureFlag.AI_COPILOT_ENABLED);

  const assistant = platform && (assistantFlag || copilotFlag);

  return {
    platform,
    search: platform && search,
    explanations: platform && explanations,
    insights: platform && insights,
    assistant,
    /** Any consumer-facing AI surface is available. */
    anyEnabled: platform && (search || explanations || insights || assistantFlag || copilotFlag),
  };
}
