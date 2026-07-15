import type { FeatureFlagKey } from './flags';
import { FEATURE_FLAG_DEFAULTS } from './flags';
import {
  clearCachedFeatureFlags,
  readCachedFeatureFlags,
  writeCachedFeatureFlags,
  type CachedFeatureFlagsPayload,
  type FeatureFlagsStorageOptions,
} from './browser-storage';

export type FeatureFlagsApiResponse = {
  version: string;
  distinctId: string;
  fetchedAt: string;
  flags: Partial<Record<FeatureFlagKey, boolean>>;
};

export type FeatureFlagsClientOptions = FeatureFlagsStorageOptions & {
  apiBase?: string;
  fetchImpl?: typeof fetch;
  getAuthHeaders?: () => Record<string, string>;
};

let inMemoryFlags: Partial<Record<FeatureFlagKey, boolean>> | null = null;
let inMemoryDistinctId: string | null = null;

function resolveApiBase(options: FeatureFlagsClientOptions): string {
  if (options.apiBase) return options.apiBase.replace(/\/$/, '');
  if (typeof import.meta !== 'undefined') {
    const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    if (env?.VITE_API_URL) return env.VITE_API_URL.replace(/\/$/, '');
  }
  return '';
}

export function getClientFeatureFlag(flag: FeatureFlagKey): boolean {
  if (inMemoryFlags && flag in inMemoryFlags) {
    return Boolean(inMemoryFlags[flag]);
  }
  const cached = resolveFlagFromCache(flag);
  if (cached !== undefined) return cached;
  return FEATURE_FLAG_DEFAULTS[flag];
}

function resolveFlagFromCache(
  flag: FeatureFlagKey,
  options?: FeatureFlagsStorageOptions,
): boolean | undefined {
  const cached = readCachedFeatureFlags(options);
  if (!cached) return undefined;
  return cached.flags[flag];
}

export function getClientDistinctId(): string {
  return inMemoryDistinctId ?? readCachedFeatureFlags()?.distinctId ?? 'anonymous';
}

export function getClientFeatureFlagsSnapshot(): Record<FeatureFlagKey, boolean> {
  return {
    ...FEATURE_FLAG_DEFAULTS,
    ...readCachedFeatureFlags()?.flags,
    ...inMemoryFlags,
  };
}

export async function loadFeatureFlagsFromApi(
  options: FeatureFlagsClientOptions = {},
): Promise<CachedFeatureFlagsPayload> {
  const cached = readCachedFeatureFlags(options);
  if (cached) {
    inMemoryFlags = cached.flags;
    inMemoryDistinctId = cached.distinctId;
    return cached;
  }

  const apiBase = resolveApiBase(options);
  const fetchFn = options.fetchImpl ?? fetch;
  const headers = new Headers(options.getAuthHeaders?.() ?? {});
  const response = await fetchFn(`${apiBase}/api/v1/features`, { headers });
  if (!response.ok) {
    throw new Error(`Feature flags request failed (${response.status})`);
  }

  const body = (await response.json()) as FeatureFlagsApiResponse;
  const payload: CachedFeatureFlagsPayload = {
    version: body.version,
    fetchedAt: Date.now(),
    distinctId: body.distinctId,
    flags: body.flags,
  };

  writeCachedFeatureFlags(payload, options);
  inMemoryFlags = payload.flags;
  inMemoryDistinctId = payload.distinctId;
  return payload;
}

export async function refreshFeatureFlagsFromApi(
  options: FeatureFlagsClientOptions = {},
): Promise<CachedFeatureFlagsPayload> {
  clearCachedFeatureFlags(options);
  inMemoryFlags = null;
  return loadFeatureFlagsFromApi(options);
}

export function primeClientFeatureFlags(payload: CachedFeatureFlagsPayload): void {
  inMemoryFlags = payload.flags;
  inMemoryDistinctId = payload.distinctId;
  writeCachedFeatureFlags(payload);
}

export function resetClientFeatureFlags(): void {
  inMemoryFlags = null;
  inMemoryDistinctId = null;
  clearCachedFeatureFlags();
}
