import { PostHog } from 'posthog-node';

import { FEATURE_FLAG_DEFAULTS, type FeatureFlagKey, isFeatureFlagKey } from './flags';
import { evaluateFlagDefinition, type FeatureFlagDefinitionValue } from './rollout';

export type FeatureFlagEnvironment = 'development' | 'test' | 'staging' | 'production';

export type FeatureFlagsConfig = {
  apiKey?: string;
  host?: string;
  environment?: FeatureFlagEnvironment;
  /** Programmatic overrides (tests only — not used in production). */
  overrides?: Partial<Record<FeatureFlagKey, boolean>>;
  /** When true, never call PostHog (default when apiKey missing). */
  useLocalOnly?: boolean;
  /** DB/admin portal definitions — evaluated with percentage rollout when set. */
  definitions?: Partial<Record<FeatureFlagKey, FeatureFlagDefinitionValue>>;
};

type FlagResolver = {
  isEnabled: (flag: FeatureFlagKey, distinctId?: string) => Promise<boolean>;
  getAll: (distinctId?: string) => Promise<Record<FeatureFlagKey, boolean>>;
  shutdown?: () => Promise<void>;
};

let resolver: FlagResolver | null = null;
let configState: FeatureFlagsConfig = {};
let definitionState: Partial<Record<FeatureFlagKey, FeatureFlagDefinitionValue>> = {};

export function setFeatureFlagDefinitions(
  definitions: Partial<Record<FeatureFlagKey, FeatureFlagDefinitionValue>>,
): void {
  definitionState = definitions;
  if (resolver) {
    initFeatureFlags({ ...configState, definitions });
  }
}

function resolveEnvironment(config: FeatureFlagsConfig): FeatureFlagEnvironment {
  if (config.environment) return config.environment;
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'test') return 'test';
  if (nodeEnv === 'production') return 'production';
  if (process.env.CARDWISE_ENV === 'staging') return 'staging';
  return 'development';
}

function resolveFromDefinitions(flag: FeatureFlagKey, distinctId: string): boolean | undefined {
  const definition = definitionState[flag] ?? configState.definitions?.[flag];
  if (!definition) return undefined;
  return evaluateFlagDefinition(definition, distinctId, flag);
}

function createLocalResolver(config: FeatureFlagsConfig): FlagResolver {
  return {
    async isEnabled(flag, distinctId = 'anonymous') {
      if (config.overrides?.[flag] !== undefined) return Boolean(config.overrides[flag]);

      const fromDefinitions = resolveFromDefinitions(flag, distinctId);
      if (fromDefinitions !== undefined) return fromDefinitions;

      return FEATURE_FLAG_DEFAULTS[flag];
    },
    async getAll(distinctId = 'anonymous') {
      const flags = Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[];
      const entries = await Promise.all(
        flags.map(async (flag) => [flag, await this.isEnabled(flag, distinctId)] as const),
      );
      return Object.fromEntries(entries) as Record<FeatureFlagKey, boolean>;
    },
  };
}

function createPostHogResolver(
  apiKey: string,
  host: string,
  config: FeatureFlagsConfig,
): FlagResolver {
  const posthog = new PostHog(apiKey, { host });

  return {
    async isEnabled(flag, distinctId = 'anonymous') {
      if (config.overrides?.[flag] !== undefined) return Boolean(config.overrides[flag]);

      const fromDefinitions = resolveFromDefinitions(flag, distinctId);
      if (fromDefinitions !== undefined) return fromDefinitions;

      try {
        const value = await posthog.isFeatureEnabled(flag, distinctId);
        if (typeof value === 'boolean') return value;
      } catch {
        // Fall through to defaults when PostHog is unreachable.
      }
      return FEATURE_FLAG_DEFAULTS[flag];
    },
    async getAll(distinctId = 'anonymous') {
      const flags = Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[];
      const entries = await Promise.all(
        flags.map(async (flag) => [flag, await this.isEnabled(flag, distinctId)] as const),
      );
      return Object.fromEntries(entries) as Record<FeatureFlagKey, boolean>;
    },
    async shutdown() {
      await posthog.shutdown();
    },
  };
}

export function initFeatureFlags(config: FeatureFlagsConfig = {}): void {
  configState = config;
  if (config.definitions) {
    definitionState = config.definitions;
  }
  const apiKey = config.apiKey ?? process.env.POSTHOG_API_KEY ?? '';
  const host = config.host ?? process.env.POSTHOG_HOST ?? 'https://app.posthog.com';
  const enabled =
    process.env.POSTHOG_FEATURE_FLAGS_ENABLED !== 'false' &&
    Boolean(apiKey) &&
    !(config.useLocalOnly ?? !apiKey);

  resolver = enabled ? createPostHogResolver(apiKey, host, config) : createLocalResolver(config);
}

export function getFeatureFlagsEnvironment(): FeatureFlagEnvironment {
  return resolveEnvironment(configState);
}

function getResolver(): FlagResolver {
  if (!resolver) {
    initFeatureFlags();
  }
  return resolver!;
}

export async function resolveFlag(
  flag: FeatureFlagKey | string,
  distinctId?: string,
): Promise<boolean> {
  if (!isFeatureFlagKey(flag)) {
    throw new Error(`Unknown feature flag: ${flag}`);
  }
  return getResolver().isEnabled(flag, distinctId);
}

export async function getAllFlags(distinctId?: string): Promise<Record<FeatureFlagKey, boolean>> {
  return getResolver().getAll(distinctId);
}

export async function shutdownFeatureFlags(): Promise<void> {
  await resolver?.shutdown?.();
  resolver = null;
  configState = {};
  definitionState = {};
}

export { isFeatureFlagKey };
