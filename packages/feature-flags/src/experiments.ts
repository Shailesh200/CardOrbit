import { rolloutBucket } from './rollout';

export type ExperimentDefinitionValue = {
  key: string;
  variants: string[];
  defaultVariant: string;
  enabled: boolean;
  rolloutPercentage: number;
};

/** Stable variant assignment for A/B experiments (same user + experiment → same variant). */
export function assignExperimentVariant(
  definition: ExperimentDefinitionValue,
  distinctId: string,
): string {
  const { variants, defaultVariant, enabled, rolloutPercentage, key } = definition;

  if (!enabled || rolloutPercentage <= 0 || variants.length === 0) {
    return defaultVariant;
  }

  const inRollout = rolloutPercentage >= 100 || rolloutBucket(distinctId, key) < rolloutPercentage;
  if (!inRollout) {
    return defaultVariant;
  }

  const variantBucket = rolloutBucket(`${distinctId}:variant`, key);
  const index = variantBucket % variants.length;
  return variants[index] ?? defaultVariant;
}

export function assignExperimentVariants(
  definitions: ExperimentDefinitionValue[],
  distinctId: string,
): Record<string, string> {
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.key,
      assignExperimentVariant(definition, distinctId),
    ]),
  );
}
