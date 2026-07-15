import type { FeatureFlagKey } from './flags';
import { FEATURE_FLAG_DEFAULTS } from './flags';

export const FEATURE_FLAGS_STORAGE_KEY = 'cardwise.feature_flags';

export type CachedFeatureFlagsPayload = {
  version: string;
  fetchedAt: number;
  distinctId: string;
  flags: Partial<Record<FeatureFlagKey, boolean>>;
};

export type FeatureFlagsStorageOptions = {
  storageKey?: string;
  ttlMs?: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function readRaw(storageKey: string): CachedFeatureFlagsPayload | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as CachedFeatureFlagsPayload;
  } catch {
    return null;
  }
}

export function readCachedFeatureFlags(
  options: FeatureFlagsStorageOptions = {},
): CachedFeatureFlagsPayload | null {
  const storageKey = options.storageKey ?? FEATURE_FLAGS_STORAGE_KEY;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cached = readRaw(storageKey);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > ttlMs) return null;
  return cached;
}

export function writeCachedFeatureFlags(
  payload: CachedFeatureFlagsPayload,
  options: FeatureFlagsStorageOptions = {},
): void {
  if (typeof localStorage === 'undefined') return;
  const storageKey = options.storageKey ?? FEATURE_FLAGS_STORAGE_KEY;
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Quota or privacy mode — ignore.
  }
}

export function clearCachedFeatureFlags(options: FeatureFlagsStorageOptions = {}): void {
  if (typeof localStorage === 'undefined') return;
  const storageKey = options.storageKey ?? FEATURE_FLAGS_STORAGE_KEY;
  localStorage.removeItem(storageKey);
}

export function resolveFlagFromCache(
  flag: FeatureFlagKey,
  options: FeatureFlagsStorageOptions = {},
): boolean | undefined {
  const cached = readCachedFeatureFlags(options);
  if (!cached) return undefined;
  return cached.flags[flag];
}

export function getCachedFlagsSnapshot(
  options: FeatureFlagsStorageOptions = {},
): Record<FeatureFlagKey, boolean> {
  const cached = readCachedFeatureFlags(options);
  return {
    ...FEATURE_FLAG_DEFAULTS,
    ...cached?.flags,
  };
}
