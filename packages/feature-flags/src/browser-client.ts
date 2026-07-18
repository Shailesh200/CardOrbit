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
let inflightFetch: Promise<CachedFeatureFlagsPayload> | null = null;

const flagListeners = new Set<() => void>();

export function subscribeClientFeatureFlags(listener: () => void): () => void {
  flagListeners.add(listener);
  return () => {
    flagListeners.delete(listener);
  };
}

function notifyFeatureFlagListeners(): void {
  for (const listener of flagListeners) {
    listener();
  }
}

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

async function fetchFeatureFlagsFromApi(
  options: FeatureFlagsClientOptions = {},
): Promise<CachedFeatureFlagsPayload> {
  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
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
    notifyFeatureFlagListeners();
    return payload;
  })().finally(() => {
    inflightFetch = null;
  });

  return inflightFetch;
}

export async function loadFeatureFlagsFromApi(
  options: FeatureFlagsClientOptions = {},
): Promise<CachedFeatureFlagsPayload> {
  const cached = readCachedFeatureFlags(options);
  if (cached) {
    inMemoryFlags = cached.flags;
    inMemoryDistinctId = cached.distinctId;
    // Stale-while-revalidate: keep serving cache while refreshing in the background.
    void fetchFeatureFlagsFromApi(options).catch(() => undefined);
    return cached;
  }

  return fetchFeatureFlagsFromApi(options);
}

export async function refreshFeatureFlagsFromApi(
  options: FeatureFlagsClientOptions = {},
): Promise<CachedFeatureFlagsPayload> {
  clearCachedFeatureFlags(options);
  inMemoryFlags = null;
  return fetchFeatureFlagsFromApi(options);
}

export function primeClientFeatureFlags(payload: CachedFeatureFlagsPayload): void {
  inMemoryFlags = payload.flags;
  inMemoryDistinctId = payload.distinctId;
  writeCachedFeatureFlags(payload);
  notifyFeatureFlagListeners();
}

export function resetClientFeatureFlags(): void {
  inMemoryFlags = null;
  inMemoryDistinctId = null;
  clearCachedFeatureFlags();
  notifyFeatureFlagListeners();
}
