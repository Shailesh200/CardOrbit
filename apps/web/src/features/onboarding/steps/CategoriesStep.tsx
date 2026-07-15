import type { ReactNode } from 'react';
import { Button, SelectableTile } from '@cardwise/ui';
import { Car, Globe, MoreHorizontal, Plane, ShoppingCart, UtensilsCrossed } from 'lucide-react';

import {
  OnboardingFooter,
  OnboardingStepShell,
} from '../../../components/onboarding/OnboardingStepShell';
import { CATEGORY_OPTIONS } from '../onboarding-api';
import type { OnboardingStepBaseProps } from '../onboarding-step-types';

const ICONS: Record<string, ReactNode> = {
  dining: <UtensilsCrossed className="size-5" />,
  travel: <Plane className="size-5" />,
  groceries: <ShoppingCart className="size-5" />,
  fuel: <Car className="size-5" />,
  online: <Globe className="size-5" />,
  other: <MoreHorizontal className="size-5" />,
};

type Props = OnboardingStepBaseProps & {
  value: string[];
  onChange: (categories: string[]) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
};

export function CategoriesStep({
  value,
  onChange,
  onContinue,
  onSkip,
  onBack,
  busy,
  actionDock,
}: Props) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((c) => c !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <OnboardingStepShell
      title="Categories you care about"
      description="Pick where you want better rewards first."
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
              disabled={busy || value.length === 0}
              onClick={onContinue}
              className="btn-premium"
            >
              Continue
            </Button>
          }
        />
      }
    >
      <div className="onboarding-option-grid onboarding-option-grid--2">
        {CATEGORY_OPTIONS.map((option) => (
          <SelectableTile
            key={option.id}
            className="onboarding-tile"
            title={option.label}
            icon={ICONS[option.id]}
            selected={value.includes(option.id)}
            onClick={() => toggle(option.id)}
          />
        ))}
      </div>
    </OnboardingStepShell>
  );
}
