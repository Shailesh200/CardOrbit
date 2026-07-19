import { Link, NavLink, Outlet } from 'react-router';
import { lazy, Suspense, useEffect } from 'react';
import { Button, Toaster, cn } from '@cardwise/ui';

import { HeroLogo } from '@brand/HeroLogo';
import { AppOriginLink } from '../components/navigation/AppOriginLink';
import { OfflineBanner } from '../components/feedback/OfflineBanner';
import { DASHBOARD_PATH } from '../features/dashboard/dashboard-path';
import { useAiFeatures } from '../features/ai/use-ai-features';
import { useDeferredAfterLoad } from '../hooks/useAfterPageLoad';
import { useAuthSession } from '../hooks/useAuthSession';
import { useMobileViewport } from '../hooks/useMobileViewport';
import { useTheme } from '../hooks/useTheme';
import { initPwaUpdate } from '../lib/pwa-update';
import { maybeTrackWebSessionStarted } from '../lib/product-analytics';
import { landingHref } from '../lib/site-origins';
import { MobileBottomNav } from './MobileBottomNav';
import { ThemeToggle } from './ThemeToggle';

const AssistantFloatingWidget = lazy(() =>
  import('../features/assistant/AssistantFloatingWidget').then((m) => ({
    default: m.AssistantFloatingWidget,
  })),
);

const ConsentBanner = lazy(() =>
  import('@features/privacy/ConsentBanner').then((m) => ({ default: m.ConsentBanner })),
);

function DeferredConsentBanner() {
  const ready = useDeferredAfterLoad(2000);
  if (!ready) return null;
  return <ConsentBanner />;
}

const authedNavLinksBase = [
  { to: DASHBOARD_PATH, label: 'Home', end: true },
  { to: '/account/cards', label: 'Cards', end: true },
  { to: '/account/merchants', label: 'Merchants', end: false },
  { to: '/account/profile', label: 'Account', end: false },
] as const;

export function AppShell() {
  const authed = useAuthSession();
  const mobileViewport = useMobileViewport();
  const { assistant } = useAiFeatures();
  const { theme, toggleTheme } = useTheme();

  const authedNavLinks = [...authedNavLinksBase];

  useEffect(() => {
    initPwaUpdate();
  }, []);

  useEffect(() => {
    maybeTrackWebSessionStarted(
      authed,
      typeof window !== 'undefined' ? window.location.pathname : undefined,
    );
  }, [authed]);

  return (
    <div
      className={cn(
        'shell flex min-h-screen flex-col',
        authed && mobileViewport && 'shell--authed-mobile',
      )}
    >
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <HeroLogo size="sm" tone="light" homeTo={authed ? DASHBOARD_PATH : landingHref('/')} />
          <div className="flex items-center gap-1 sm:gap-2">
            <nav
              className={cn('items-center gap-1 sm:gap-2', authed ? 'hidden lg:flex' : 'flex')}
              aria-label="Primary"
            >
              {authed ? (
                <>
                  {authedNavLinks.map(({ to, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn('consumer-nav-link inline-flex', isActive && 'is-active')
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </>
              ) : (
                <>
                  <AppOriginLink
                    className="consumer-nav-link inline-flex"
                    to="/login"
                    marketingCta={{ placement: 'nav', cta: 'sign_in' }}
                  >
                    Sign in
                  </AppOriginLink>
                  <Button asChild size="sm" className="consumer-nav-cta">
                    <AppOriginLink
                      to="/signup"
                      marketingCta={{ placement: 'nav', cta: 'get_started' }}
                    >
                      Get started
                    </AppOriginLink>
                  </Button>
                </>
              )}
            </nav>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <div aria-hidden className="site-header-spacer shrink-0" />

      <OfflineBanner />

      <main id="main-content" className="shell-main flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      {authed && mobileViewport ? <MobileBottomNav /> : null}

      {authed && assistant ? (
        <Suspense fallback={null}>
          <AssistantFloatingWidget />
        </Suspense>
      ) : null}

      <footer className={cn('consumer-footer', authed && 'hidden lg:block')}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-center sm:flex-row sm:text-left">
          <HeroLogo size="sm" tone="dark" linked={false} />
          <nav className="flex flex-wrap justify-center gap-5" aria-label="Legal">
            <Link className="consumer-footer-link" to="/privacy">
              Privacy
            </Link>
            <Link className="consumer-footer-link" to="/terms">
              Terms
            </Link>
            <Link className="consumer-footer-link" to="/cookies">
              Cookies
            </Link>
          </nav>
        </div>
      </footer>

      <Suspense fallback={null}>
        <DeferredConsentBanner />
      </Suspense>
      <Toaster theme={theme} position="top-right" closeButton richColors />
    </div>
  );
}
