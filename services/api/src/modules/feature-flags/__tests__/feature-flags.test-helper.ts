import type { FeatureFlagKey } from '@cardwise/feature-flags';
import type { FeatureFlagsSnapshot } from '@cardwise/validation';

import type { FeatureFlagsService } from '../feature-flags.service';

/** Integration tests: all flags enabled for any user. */
export function createPermissiveFeatureFlagsService(): FeatureFlagsService {
  return {
    isEnabled: async (_flag: FeatureFlagKey, _distinctId?: string) => true,
    getEvaluatedSnapshot: async (distinctId: string): Promise<FeatureFlagsSnapshot> => ({
      version: 'test',
      distinctId,
      fetchedAt: new Date().toISOString(),
      flags: {},
    }),
    listDefinitions: async () => [],
    updateDefinition: async () => {
      throw new Error('Not implemented in test helper');
    },
    onModuleInit: async () => undefined,
  } as unknown as FeatureFlagsService;
}
