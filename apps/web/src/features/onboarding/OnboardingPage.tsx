import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@cardwise/ui';

import '../../pages/onboarding.css';
import { OnboardingProgress, stepToIndex } from '../../components/onboarding/OnboardingProgress';
import { OnboardingRail } from '../../components/onboarding/OnboardingRail';
import { ErrorFallback } from '../../components/feedback/ErrorFallback';
import { logout } from '../../lib/auth-api';
import { notify, toast } from '../../lib/app-toast';
import {
  completeOnboarding,
  getOnboardingState,
  patchOnboarding,
  skipOnboarding,
  type OnboardingState,
  type SpendBand,
} from './onboarding-api';
import { consumerLink } from '../../lib/consumer-link';
import { DASHBOARD_PATH } from '../dashboard/dashboard-path';
import { CardsDeferStep } from './steps/CardsDeferStep';
import { CategoriesStep } from './steps/CategoriesStep';
import { CompleteStep } from './steps/CompleteStep';
import { SpendingStep } from './steps/SpendingStep';
import { WelcomeStep } from './steps/WelcomeStep';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [spendBand, setSpendBand] = useState<SpendBand | undefined>();
  const [categories, setCategories] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionDock, setActionDock] = useState<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const next = await getOnboardingState();
    setState(next);
    setSpendBand(next.answers.spendBand);
    setCategories(next.answers.categories ?? []);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getOnboardingState();
        if (cancelled) return;
        if (next.isComplete && next.status !== 'IN_PROGRESS') {
          navigate(DASHBOARD_PATH, { replace: true });
          return;
        }
        setState(next);
        setSpendBand(next.answers.spendBand);
        setCategories(next.answers.categories ?? []);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load onboarding');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function run(action: () => Promise<OnboardingState>) {
    setBusy(true);
    try {
      const next = await action();
      setState(next);
      setSpendBand(next.answers.spendBand);
      setCategories(next.answers.categories ?? []);
      return next;
    } catch (error) {
      notify.fromError(error, 'Something went wrong');
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function onSkipAll() {
    await run(() => skipOnboarding());
    toast.info('Onboarding skipped — you can finish setup anytime from your account');
    navigate(DASHBOARD_PATH, { replace: true });
  }

  async function onFinish() {
    if (state && !state.isComplete) {
      await run(() => completeOnboarding());
    }
    navigate(DASHBOARD_PATH, { replace: true });
  }

  if (loadError) {
    const isAuthError = /unauthorized|not active|not verified/i.test(loadError);
    return (
      <div className="space-y-4">
        <ErrorFallback
          title={isAuthError ? 'Session expired' : 'Could not load setup'}
          message={isAuthError ? 'Please sign in again to continue your account setup.' : loadError}
          onRetry={
            isAuthError
              ? undefined
              : () => {
                  setLoadError(null);
                  void refresh().catch((error: Error) => setLoadError(error.message));
                }
          }
          showHome={!isAuthError}
        />
        {isAuthError ? (
          <p className="text-center">
            <Link className={consumerLink} to="/login">
              Go to sign in
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  if (!state) {
    return (
      <p className="px-4 py-16 text-center text-sm text-muted-foreground">Loading onboarding…</p>
    );
  }

  const showComplete =
    state.step === 'DONE' || state.status === 'COMPLETED' || state.status === 'SKIPPED';

  const currentStep = showComplete ? 'DONE' : state.step;

  const stepProps = { actionDock, busy };

  return (
    <div className="onboarding-page">
      <div className="onboarding-page__frame consumer-page">
        <OnboardingRail step={currentStep} showComplete={showComplete} />

        <div className="onboarding-page__panel consumer-surface consumer-surface-accent consumer-surface--glass animate-fade-in-up">
          <OnboardingRail step={currentStep} showComplete={showComplete} compact />

          <header className="onboarding-page__header">
            <p className="onboarding-page__kicker">Setup</p>
            {state.step !== 'CARDS' && !showComplete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
              >
                Log out
              </Button>
            ) : (
              <span className="size-8" aria-hidden />
            )}
          </header>

          {!showComplete ? <OnboardingProgress currentIndex={stepToIndex(state.step)} /> : null}

          <div className="onboarding-page__content">
            {showComplete ? (
              <div key="complete" className="step-enter">
                <CompleteStep {...stepProps} onFinish={() => void onFinish()} />
              </div>
            ) : state.step === 'WELCOME' ? (
              <div key="welcome" className="step-enter">
                <WelcomeStep
                  {...stepProps}
                  onContinue={() => void run(() => patchOnboarding({ action: 'complete_step' }))}
                  onSkipAll={() => void onSkipAll()}
                />
              </div>
            ) : state.step === 'SPENDING' ? (
              <div key="spending" className="step-enter">
                <SpendingStep
                  {...stepProps}
                  value={spendBand}
                  onChange={setSpendBand}
                  onContinue={() =>
                    void run(() =>
                      patchOnboarding({
                        action: 'complete_step',
                        answers: spendBand ? { spendBand } : undefined,
                      }),
                    )
                  }
                  onSkip={() => void run(() => patchOnboarding({ action: 'skip_step' }))}
                  onBack={() => void run(() => patchOnboarding({ action: 'back' }))}
                />
              </div>
            ) : state.step === 'CATEGORIES' ? (
              <div key="categories" className="step-enter">
                <CategoriesStep
                  {...stepProps}
                  value={categories}
                  onChange={setCategories}
                  onContinue={() =>
                    void run(() =>
                      patchOnboarding({
                        action: 'complete_step',
                        answers: { categories },
                      }),
                    )
                  }
                  onSkip={() => void run(() => patchOnboarding({ action: 'skip_step' }))}
                  onBack={() => void run(() => patchOnboarding({ action: 'back' }))}
                />
              </div>
            ) : (
              <div key="cards" className="step-enter">
                <CardsDeferStep
                  {...stepProps}
                  onContinue={() => void run(() => patchOnboarding({ action: 'complete_step' }))}
                  onBack={() => void run(() => patchOnboarding({ action: 'back' }))}
                />
              </div>
            )}
          </div>

          <div
            ref={setActionDock}
            className="onboarding-page__action-dock"
            aria-label="Step actions"
          />
        </div>
      </div>
    </div>
  );
}
