import type { FeatureFlagKey } from './flags';
import { isFeatureFlagKey } from './flags';
import { setFeatureFlagDefinitions } from './client';
import type { FeatureFlagDefinitionValue } from './rollout';

export type FeatureFlagDefinitionRow = {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
};

/** Apply DB/admin portal definitions — sole runtime source for flag rollout. */
export function applyFeatureFlagDefinitions(rows: FeatureFlagDefinitionRow[]): void {
  const definitions: Partial<Record<FeatureFlagKey, FeatureFlagDefinitionValue>> = {};

  for (const row of rows) {
    if (!isFeatureFlagKey(row.key)) continue;
    definitions[row.key] = {
      enabled: row.enabled,
      rolloutPercentage: row.rolloutPercentage,
    };
  }

  setFeatureFlagDefinitions(definitions);
}
