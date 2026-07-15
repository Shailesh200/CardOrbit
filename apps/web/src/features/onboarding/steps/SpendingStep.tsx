import type { ReactNode } from 'react';
import { Button, SelectableTile } from '@cardwise/ui';
import { Crown, TrendingUp, Wallet } from 'lucide-react';

import {
  OnboardingFooter,
  OnboardingStepShell,
} from '../../../components/onboarding/OnboardingStepShell';
import { SPEND_BAND_OPTIONS, type SpendBand } from '../onboarding-api';
import type { OnboardingStepBaseProps } from '../onboarding-step-types';

const SPEND_ICONS: Record<SpendBand, ReactNode> = {
  UNDER_10K: <Wallet className="size-5" />,
  '10K_50K': <TrendingUp className="size-5" />,
  '50K_PLUS': <Crown className="size-5" />,
};

type Props = OnboardingStepBaseProps & {
  value?: SpendBand;
  onChange: (band: SpendBand) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
};

export function SpendingStep({
  value,
  onChange,
  onContinue,
  onSkip,
  onBack,
  busy,
  actionDock,
}: Props) {
  return (
    <OnboardingStepShell
      title="Spending preferences"
      description="Rough monthly card spend helps us prioritize rewards."
      actionDock={actionDock}
      footer={
        <OnboardingFooter
          back={onBack}
          backDisabled={busy}
          skip={onSkip}
          skipDisabled={busy}
          actions={
            <Button
              type="button"
              disabled={busy || !value}
              onClick={onContinue}
              className="btn-premium"
            >
              Continue
            </Button>
          }
        />
      }
    >
      <div className="onboarding-option-grid onboarding-option-grid--3">
        {SPEND_BAND_OPTIONS.map((option) => (
          <SelectableTile
            key={option.id}
            className="onboarding-tile onboarding-tile--compact"
            title={option.label}
            description={option.description}
            icon={SPEND_ICONS[option.id]}
            selected={value === option.id}
            onClick={() => onChange(option.id)}
          />
        ))}
      </div>
    </OnboardingStepShell>
  );
}
