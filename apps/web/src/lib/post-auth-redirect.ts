import { getOnboardingState, postAuthPath } from '../features/onboarding/onboarding-api';

/** Resolve where to send the user after a successful login / OAuth callback. */
export async function resolvePostAuthPath(): Promise<string> {
  try {
    const state = await getOnboardingState();
    return postAuthPath(state);
  } catch {
    return '/onboarding';
  }
}
