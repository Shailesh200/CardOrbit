import type { OnboardingState } from './onboarding-api';

/** Local mirror of FeatureFlag.ONBOARDING_V1 default (true). API also returns flagEnabled. */
const ONBOARDING_V1_DEFAULT = true;

/** Account paths reachable during onboarding (e.g. cards step). */
export const ONBOARDING_ALLOWED_ACCOUNT_PREFIXES = ['/account/cards'] as const;

export function isOnboardingAllowedAccountPath(pathname: string): boolean {
  return ONBOARDING_ALLOWED_ACCOUNT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Whether the auth gate should send the user into `/onboarding`.
 * When onboarding_v1 is disabled, treat as finished (gate passes through).
 */
export function needsOnboardingGate(
  state: Pick<OnboardingState, 'isComplete' | 'status' | 'flagEnabled'> | null | undefined,
  flagEnabled: boolean = ONBOARDING_V1_DEFAULT,
): boolean {
  if (!flagEnabled) return false;
  if (!state) return true;
  if (state.flagEnabled === false) return false;
  return !state.isComplete;
}
