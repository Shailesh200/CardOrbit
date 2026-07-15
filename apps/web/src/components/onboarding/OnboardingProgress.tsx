import { cn } from '@cardwise/ui';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 'WELCOME', label: 'Welcome' },
  { id: 'SPENDING', label: 'Spending' },
  { id: 'CATEGORIES', label: 'Categories' },
  { id: 'CARDS', label: 'Cards' },
] as const;

type OnboardingProgressProps = {
  currentIndex: number;
};

export function OnboardingProgress({ currentIndex }: OnboardingProgressProps) {
  const pct = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <div className="onboarding-progress">
      <div className="onboarding-progress__meta">
        <span className="onboarding-progress__step-label">
          Step <strong>{currentIndex + 1}</strong> of {STEPS.length}
        </span>
      </div>
      <div className="onboarding-progress__track" aria-hidden>
        <div className="onboarding-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <ol className="onboarding-progress__steps">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li
              key={step.id}
              className={cn('onboarding-progress__pill', done && 'is-done', active && 'is-active')}
            >
              <span className="onboarding-progress__pill-dot" aria-hidden>
                {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              <span className="onboarding-progress__pill-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function stepToIndex(step: string): number {
  switch (step) {
    case 'WELCOME':
      return 0;
    case 'SPENDING':
      return 1;
    case 'CATEGORIES':
      return 2;
    case 'CARDS':
      return 3;
    default:
      return 3;
  }
}
