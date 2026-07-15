/** Stable 0–99 bucket for percentage rollout (same user + flag → same bucket). */
export function rolloutBucket(distinctId: string, flagKey: string): number {
  const input = `${distinctId}:${flagKey}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

export type FeatureFlagDefinitionValue = {
  enabled: boolean;
  rolloutPercentage: number;
};

export function evaluateFlagDefinition(
  definition: FeatureFlagDefinitionValue,
  distinctId: string,
  flagKey: string,
): boolean {
  if (!definition.enabled) return false;
  if (definition.rolloutPercentage >= 100) return true;
  if (definition.rolloutPercentage <= 0) return false;
  return rolloutBucket(distinctId, flagKey) < definition.rolloutPercentage;
}
