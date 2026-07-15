import { Link } from 'react-router';
import { Button } from '@cardwise/ui';

import { Illustration } from '../../../components/illustrations/Illustration';
import {
  OnboardingFooter,
  OnboardingStepShell,
} from '../../../components/onboarding/OnboardingStepShell';
import { consumerLink } from '../../../lib/consumer-link';
import type { OnboardingStepBaseProps } from '../onboarding-step-types';

type Props = OnboardingStepBaseProps & {
  onContinue: () => void;
  onBack: () => void;
};

export function CardsDeferStep({ onContinue, onBack, busy, actionDock }: Props) {
  return (
    <OnboardingStepShell
      title="Your cards"
      description="Add cards from our catalog in your account, or skip and come back anytime."
      actionDock={actionDock}
      hero={
        <div className="onboarding-cards-hero">
          <Illustration
            id="empty-wallet"
            animate
            className="onboarding-cards-hero__visual h-28 w-full max-w-[180px]"
          />
        </div>
      }
      footer={
        <OnboardingFooter
          back={onBack}
          backDisabled={busy}
          actions={
            <>
              <Button asChild className="btn-premium" size="lg">
                <Link to="/account/cards/add">Add cards now</Link>
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={onContinue}>
                Continue without cards
              </Button>
            </>
          }
          hint={
            <Link className={consumerLink} to="/account/cards">
              View portfolio
            </Link>
          }
        />
      }
    />
  );
}
