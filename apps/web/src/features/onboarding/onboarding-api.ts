import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type OnboardingStep = 'WELCOME' | 'SPENDING' | 'CATEGORIES' | 'CARDS' | 'DONE';

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type SpendBand = 'UNDER_10K' | '10K_50K' | '50K_PLUS';

export type OnboardingAnswers = {
  spendBand?: SpendBand;
  categories?: string[];
};

export type OnboardingState = {
  status: OnboardingStatus;
  step: OnboardingStep;
  answers: OnboardingAnswers;
  completedAt: string | null;
  flagEnabled: boolean;
  isComplete: boolean;
  allowedActions: Array<'complete_step' | 'skip_step' | 'back' | 'complete' | 'skip_all'>;
};

export function getOnboardingState() {
  return authFetch<OnboardingState>('/api/v1/onboarding', {}, API_BASE);
}

export function patchOnboarding(body: {
  action: 'complete_step' | 'skip_step' | 'back';
  answers?: OnboardingAnswers;
}) {
  return authFetch<OnboardingState>(
    '/api/v1/onboarding',
    { method: 'PATCH', body: JSON.stringify(body) },
    API_BASE,
  );
}

export function completeOnboarding() {
  return authFetch<OnboardingState>(
    '/api/v1/onboarding/complete',
    { method: 'POST', body: '{}' },
    API_BASE,
  );
}

export function skipOnboarding() {
  return authFetch<OnboardingState>(
    '/api/v1/onboarding/skip',
    { method: 'POST', body: '{}' },
    API_BASE,
  );
}

import { DASHBOARD_PATH } from '../dashboard/dashboard-path';

/** Destination after login/signup/oauth when onboarding may still be required. */
export function postAuthPath(state: Pick<OnboardingState, 'isComplete'>): string {
  return state.isComplete ? DASHBOARD_PATH : '/onboarding';
}

export const CATEGORY_OPTIONS = [
  { id: 'dining', label: 'Dining' },
  { id: 'travel', label: 'Travel' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'online', label: 'Online shopping' },
  { id: 'other', label: 'Other' },
] as const;

export const SPEND_BAND_OPTIONS: { id: SpendBand; label: string; description: string }[] = [
  { id: 'UNDER_10K', label: 'Under ₹10k', description: 'Monthly card spend' },
  { id: '10K_50K', label: '₹10k – ₹50k', description: 'Monthly card spend' },
  { id: '50K_PLUS', label: 'Over ₹50k', description: 'Monthly card spend' },
];
