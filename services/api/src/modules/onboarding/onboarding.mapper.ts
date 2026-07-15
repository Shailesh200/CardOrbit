import type { OnboardingStatus, OnboardingStep, User } from '@prisma/client';
import {
  DEFAULT_REWARD_PERSONALIZATION,
  parseOnboardingAnswers,
  type OnboardingAnswers,
  type RewardPersonalizationProfile,
} from '@cardwise/validation';

export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
  'WELCOME',
  'SPENDING',
  'CATEGORIES',
  'CARDS',
  'DONE',
];

export type OnboardingStateDto = {
  status: OnboardingStatus;
  step: OnboardingStep;
  answers: OnboardingAnswers;
  completedAt: string | null;
  flagEnabled: boolean;
  isComplete: boolean;
  allowedActions: Array<'complete_step' | 'skip_step' | 'back' | 'complete' | 'skip_all'>;
};

export function isOnboardingFinished(status: OnboardingStatus): boolean {
  return status === 'COMPLETED' || status === 'SKIPPED';
}

export function nextStep(step: OnboardingStep): OnboardingStep {
  const idx = ONBOARDING_STEP_ORDER.indexOf(step);
  if (idx < 0 || idx >= ONBOARDING_STEP_ORDER.length - 1) {
    return 'DONE';
  }
  return ONBOARDING_STEP_ORDER[idx + 1]!;
}

export function previousStep(step: OnboardingStep): OnboardingStep {
  const idx = ONBOARDING_STEP_ORDER.indexOf(step);
  if (idx <= 0) {
    return 'WELCOME';
  }
  return ONBOARDING_STEP_ORDER[idx - 1]!;
}

export function parseAnswersFromUser(user: User): OnboardingAnswers {
  try {
    return parseOnboardingAnswers(user.onboardingAnswers);
  } catch {
    return {};
  }
}

export function toOnboardingStateDto(user: User, flagEnabled: boolean): OnboardingStateDto {
  if (!flagEnabled) {
    return {
      status: 'SKIPPED',
      step: 'DONE',
      answers: parseAnswersFromUser(user),
      completedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      flagEnabled: false,
      isComplete: true,
      allowedActions: [],
    };
  }

  const status = user.onboardingStatus;
  const step = user.onboardingStep;
  const finished = isOnboardingFinished(status);
  const allowedActions: OnboardingStateDto['allowedActions'] = [];

  if (!finished) {
    if (step !== 'DONE') {
      allowedActions.push('complete_step', 'skip_step');
    }
    if (step !== 'WELCOME') {
      allowedActions.push('back');
    }
    allowedActions.push('complete', 'skip_all');
  }

  return {
    status,
    step,
    answers: parseAnswersFromUser(user),
    completedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    flagEnabled: true,
    isComplete: finished,
    allowedActions,
  };
}

/** Personalization profile seeded when onboarding completes (M-028). */
export function buildPersonalizationFromOnboarding(
  answers: OnboardingAnswers,
): RewardPersonalizationProfile {
  return {
    ...DEFAULT_REWARD_PERSONALIZATION,
    spendBand: answers.spendBand,
    categories: answers.categories,
    preferredCategorySlugs: answers.categories ?? [],
    updatedAt: new Date().toISOString(),
  };
}
