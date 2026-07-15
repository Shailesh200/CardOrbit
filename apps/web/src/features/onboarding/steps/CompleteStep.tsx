import { Button } from '@cardwise/ui';

import { SuccessLottie } from '../../../components/motion/SuccessLottie';
import {
  OnboardingFooter,
  OnboardingStepShell,
} from '../../../components/onboarding/OnboardingStepShell';
import type { OnboardingStepBaseProps } from '../onboarding-step-types';

type Props = OnboardingStepBaseProps & {
  onFinish: () => void;
};

export function CompleteStep({ onFinish, busy, actionDock }: Props) {
  return (
    <OnboardingStepShell
      title="You're set"
      description="Next up: manage your profile, then add cards and get personalized recommendations as those features roll out."
      hero={<SuccessLottie className="onboarding-step__hero-visual mx-auto size-36" />}
      actionDock={actionDock}
      footer={
        <OnboardingFooter
          actions={
            <Button
              type="button"
              disabled={busy}
              onClick={onFinish}
              className="btn-premium rounded-xl"
            >
              Go to account
            </Button>
          }
        />
      }
    />
  );
}
