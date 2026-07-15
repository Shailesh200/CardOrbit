import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FeatureFlag,
  FEATURE_FLAG_DEFAULTS,
  getAllFlags,
  getFeatureFlagsEnvironment,
  initFeatureFlags,
  isEnabled,
  shutdownFeatureFlags,
} from './index';

describe('@cardwise/feature-flags', () => {
  beforeEach(() => {
    delete process.env.CARDWISE_FLAG_AI_ASSISTANT_ENABLED;
    delete process.env.CARDWISE_FLAG_BROWSER_EXTENSION_ENABLED;
    initFeatureFlags({ useLocalOnly: true, environment: 'development' });
  });

  afterEach(async () => {
    delete process.env.CARDWISE_FLAG_AI_ASSISTANT_ENABLED;
    delete process.env.CARDWISE_FLAG_BROWSER_EXTENSION_ENABLED;
    await shutdownFeatureFlags();
  });

  it('defines Phase 0 flags with expected defaults', () => {
    expect(FeatureFlag.BROWSER_EXTENSION_ENABLED).toBe('browser_extension_enabled');
    expect(FeatureFlag.AI_PLATFORM_ENABLED).toBe('ai_platform_enabled');
    expect(FeatureFlag.ONBOARDING_V1).toBe('onboarding_v1');
    expect(FeatureFlag.PORTFOLIO_V1).toBe('portfolio_v1');
    expect(FEATURE_FLAG_DEFAULTS.browser_extension_enabled).toBe(true);
    expect(FEATURE_FLAG_DEFAULTS.ai_platform_enabled).toBe(false);
    expect(FEATURE_FLAG_DEFAULTS.ai_assistant_enabled).toBe(false);
    expect(FEATURE_FLAG_DEFAULTS.ai_copilot_enabled).toBe(true);
    expect(FEATURE_FLAG_DEFAULTS.travel_booking_enabled).toBe(true);
    expect(FEATURE_FLAG_DEFAULTS.premium_features_enabled).toBe(false);
    expect(FEATURE_FLAG_DEFAULTS.onboarding_v1).toBe(true);
  });

  it('resolves flags correctly for development environment', async () => {
    expect(getFeatureFlagsEnvironment()).toBe('development');
    expect(await isEnabled(FeatureFlag.BROWSER_EXTENSION_ENABLED)).toBe(true);
    expect(await isEnabled(FeatureFlag.AI_ASSISTANT_ENABLED)).toBe(false);
    expect(await isEnabled(FeatureFlag.TRAVEL_BOOKING_ENABLED)).toBe(true);
    expect(await isEnabled(FeatureFlag.PREMIUM_FEATURES_ENABLED)).toBe(false);
    expect(await isEnabled(FeatureFlag.ONBOARDING_V1)).toBe(true);
    expect(await isEnabled(FeatureFlag.PORTFOLIO_V1)).toBe(true);
  });

  it('applies explicit overrides', async () => {
    initFeatureFlags({
      useLocalOnly: true,
      overrides: { ai_assistant_enabled: true },
    });
    expect(await isEnabled(FeatureFlag.AI_ASSISTANT_ENABLED)).toBe(true);
  });

  it('evaluates percentage rollout from definitions', async () => {
    initFeatureFlags({
      useLocalOnly: true,
      definitions: {
        ai_assistant_enabled: { enabled: true, rolloutPercentage: 100 },
      },
    });
    expect(await isEnabled(FeatureFlag.AI_ASSISTANT_ENABLED, 'user-a')).toBe(true);

    initFeatureFlags({
      useLocalOnly: true,
      definitions: {
        ai_assistant_enabled: { enabled: true, rolloutPercentage: 0 },
      },
    });
    expect(await isEnabled(FeatureFlag.AI_ASSISTANT_ENABLED, 'user-a')).toBe(false);
  });

  it('ignores legacy CARDWISE_FLAG_* environment variables', async () => {
    process.env.CARDWISE_FLAG_AI_ASSISTANT_ENABLED = 'true';
    initFeatureFlags({
      useLocalOnly: true,
      definitions: {
        ai_assistant_enabled: { enabled: false, rolloutPercentage: 100 },
      },
    });
    expect(await isEnabled(FeatureFlag.AI_ASSISTANT_ENABLED)).toBe(false);
  });

  it('returns all feature flags', async () => {
    const flags = await getAllFlags();
    expect(Object.keys(flags).sort()).toEqual(Object.keys(FEATURE_FLAG_DEFAULTS).sort());
  });
});
