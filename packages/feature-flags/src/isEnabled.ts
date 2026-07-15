import { resolveFlag } from './client';
import type { FeatureFlagKey } from './flags';

/**
 * Server-side / universal flag check.
 * Prefer this in NestJS/API and Vite SSR contexts.
 */
export async function isEnabled(flag: FeatureFlagKey, distinctId?: string): Promise<boolean> {
  return resolveFlag(flag, distinctId);
}
