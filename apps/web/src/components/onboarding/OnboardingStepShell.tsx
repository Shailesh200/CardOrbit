import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@cardwise/ui';

type OnboardingStepShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
  hero?: ReactNode;
  footer: ReactNode;
  /** When set, footer renders into the panel action dock (fixed position). */
  actionDock?: HTMLElement | null;
};

/** Shared content column for onboarding steps. */
export function OnboardingStepShell({
  title,
  description,
  children,
  hero,
  footer,
  actionDock,
}: OnboardingStepShellProps) {
  const footerNode = <div className="onboarding-footer-slot">{footer}</div>;

  return (
    <div className="onboarding-step">
      <div className="onboarding-step__header">
        <h2 className="onboarding-step__title font-display">{title}</h2>
        <p className="onboarding-step__description">{description}</p>
      </div>
      <div className="onboarding-step__scroll">
        {hero ? <div className="onboarding-step__hero">{hero}</div> : null}
        {children ? <div className="onboarding-step__body">{children}</div> : null}
      </div>
      {actionDock ? createPortal(footerNode, actionDock) : footerNode}
    </div>
  );
}

type OnboardingFooterProps = {
  actions?: ReactNode;
  back?: () => void;
  backDisabled?: boolean;
  skip?: () => void;
  skipDisabled?: boolean;
  skipLabel?: string;
  hint?: ReactNode;
};

/** Unified step footer — nav row + primary actions + optional hint. */
export function OnboardingFooter({
  actions,
  back,
  backDisabled,
  skip,
  skipDisabled,
  skipLabel = 'Skip this step',
  hint,
}: OnboardingFooterProps) {
  const showNav = Boolean(back || skip);

  return (
    <div className="onboarding-footer">
      {showNav ? (
        <div className="onboarding-footer__nav">
          {back ? (
            <Button type="button" variant="ghost" size="sm" disabled={backDisabled} onClick={back}>
              Back
            </Button>
          ) : (
            <span aria-hidden />
          )}
          {skip ? (
            <Button type="button" variant="ghost" size="sm" disabled={skipDisabled} onClick={skip}>
              {skipLabel}
            </Button>
          ) : (
            <span aria-hidden />
          )}
        </div>
      ) : null}
      {actions ? <div className="onboarding-footer__actions">{actions}</div> : null}
      {hint ? <div className="onboarding-footer__hint">{hint}</div> : null}
    </div>
  );
}
