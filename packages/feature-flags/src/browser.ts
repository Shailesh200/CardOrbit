/** Browser-safe feature flags — no posthog-node server client. */
export { FeatureFlag, FEATURE_FLAG_DEFAULTS, type FeatureFlagKey, isFeatureFlagKey } from './flags';
export { useFeatureFlag } from './useFeatureFlag';
export { evaluateFlagDefinition, rolloutBucket, type FeatureFlagDefinitionValue } from './rollout';
export {
  FEATURE_FLAGS_STORAGE_KEY,
  clearCachedFeatureFlags,
  getCachedFlagsSnapshot,
  readCachedFeatureFlags,
  resolveFlagFromCache,
  writeCachedFeatureFlags,
  type CachedFeatureFlagsPayload,
  type FeatureFlagsStorageOptions,
} from './browser-storage';
export {
  getClientDistinctId,
  getClientFeatureFlag,
  getClientFeatureFlagsSnapshot,
  loadFeatureFlagsFromApi,
  primeClientFeatureFlags,
  refreshFeatureFlagsFromApi,
  resetClientFeatureFlags,
  type FeatureFlagsApiResponse,
  type FeatureFlagsClientOptions,
} from './browser-client';
