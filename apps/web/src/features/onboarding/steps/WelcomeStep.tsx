import { Button } from '@cardwise/ui';

import { Illustration } from '../../../components/illustrations/Illustration';
import {
  OnboardingFooter,
  OnboardingStepShell,
} from '../../../components/onboarding/OnboardingStepShell';
import type { OnboardingStepBaseProps } from '../onboarding-step-types';

type Props = OnboardingStepBaseProps & {
  onContinue: () => void;
  onSkipAll: () => void;
};

export function WelcomeStep({ onContinue, onSkipAll, busy, actionDock }: Props) {
  return (
    <OnboardingStepShell
      title="Welcome to CardOrbit"
      description="A short setup so recommendations match how you spend. You can skip anytime and add details later."
      hero={
        <Illustration
          id="card-stack"
          animate
          className="onboarding-step__hero-visual h-36 w-full max-w-[220px]"
        />
      }
      actionDock={actionDock}
      footer={
        <OnboardingFooter
          skip={onSkipAll}
          skipDisabled={busy}
          skipLabel="Skip for now"
          actions={
            <Button type="button" disabled={busy} onClick={onContinue} className="btn-premium">
              Get started
            </Button>
          }
        />
      }
    />
  );
}
