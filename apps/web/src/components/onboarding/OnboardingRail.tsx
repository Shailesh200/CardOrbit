import { memo } from 'react';

import { AnimatedCardStack } from '@brand/AnimatedCardStack';
import { CategoriesIllustration } from '@brand/CategoriesIllustration';
import { EmptyWalletIllustration } from '@brand/EmptyWalletIllustration';
import { SpendingIllustration } from '@brand/SpendingIllustration';
import { HeroLogo } from '@brand/HeroLogo';
import { SuccessLottie } from '@motion/SuccessLottie';

type OnboardingStepKey = 'WELCOME' | 'SPENDING' | 'CATEGORIES' | 'CARDS' | 'DONE';

const STEP_COPY: Record<OnboardingStepKey, { eyebrow: string; headline: string; body: string }> = {
  WELCOME: {
    eyebrow: 'Step 1',
    headline: 'Personalized from day one',
    body: 'A quick profile so every recommendation fits how you actually spend.',
  },
  SPENDING: {
    eyebrow: 'Step 2',
    headline: 'Your spending rhythm',
    body: 'Monthly spend bands help us weigh cashback vs. travel rewards for you.',
  },
  CATEGORIES: {
    eyebrow: 'Step 3',
    headline: 'Where rewards matter',
    body: 'Pick the categories you want optimized first — dining, travel, and more.',
  },
  CARDS: {
    eyebrow: 'Step 4',
    headline: 'Build your portfolio',
    body: 'Add cards from our catalog now, or skip and return when you are ready.',
  },
  DONE: {
    eyebrow: 'Complete',
    headline: 'You are all set',
    body: 'Your account is ready. Add cards and tune your profile anytime.',
  },
};

function stepVisual(step: OnboardingStepKey) {
  switch (step) {
    case 'WELCOME':
      return <AnimatedCardStack className="w-full max-w-[260px]" />;
    case 'SPENDING':
      return <SpendingIllustration className="mx-auto h-44 w-full max-w-[240px] animate-float" />;
    case 'CATEGORIES':
      return <CategoriesIllustration className="mx-auto h-44 w-44" />;
    case 'CARDS':
      return (
        <EmptyWalletIllustration className="mx-auto h-44 w-full max-w-[240px] animate-float" />
      );
    case 'DONE':
      return (
        <div className="onboarding-rail__success">
          <SuccessLottie className="size-28" />
        </div>
      );
  }
}

type Props = {
  step: string;
  showComplete: boolean;
  compact?: boolean;
};

export const OnboardingRail = memo(function OnboardingRail({
  step,
  showComplete,
  compact = false,
}: Props) {
  const key: OnboardingStepKey = showComplete
    ? 'DONE'
    : step === 'WELCOME' || step === 'SPENDING' || step === 'CATEGORIES' || step === 'CARDS'
      ? step
      : 'CARDS';
  const copy = STEP_COPY[key];

  return (
    <aside
      className={`onboarding-rail ${compact ? 'onboarding-rail--compact' : ''}`}
      aria-hidden={compact}
    >
      <div className="onboarding-rail__ambient" />
      <div className="onboarding-rail__grain" />
      {!compact ? <HeroLogo size="sm" tone="dark" className="onboarding-rail__logo" /> : null}
      <div className="onboarding-rail__visual" key={key}>
        {stepVisual(key)}
      </div>
      <div className="onboarding-rail__copy">
        <p className="onboarding-rail__eyebrow">{copy.eyebrow}</p>
        <h2 className="onboarding-rail__headline font-display">{copy.headline}</h2>
        {!compact ? <p className="onboarding-rail__body">{copy.body}</p> : null}
      </div>
    </aside>
  );
});
