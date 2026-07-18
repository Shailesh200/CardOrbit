import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  Inbox,
  Layers,
  Menu,
  RefreshCw,
  Scale,
  Sparkles,
  Tag,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Button, Toaster, cn } from '@cardwise/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminNavItem, AdminPortalConfig } from '@cardwise/admin-config';

import { ADMIN_SESSION_EXPIRED_EVENT, clearAdminToken, fetchAdminConfig } from '../lib/api';
import { notify, safeMessage } from '../lib/notify';

export type AdminShellContext = {
  config: AdminPortalConfig | null;
  configStatus: 'loading' | 'error' | 'ready';
  configError: string | null;
  retryConfig: () => void;
};

const ICONS: Record<string, LucideIcon> = {
  'chart-bar': BarChart3,
  'refresh-cw': RefreshCw,
  inbox: Inbox,
  layers: Layers,
  'credit-card': CreditCard,
  scale: Scale,
  tag: Tag,
  sparkles: Sparkles,
  users: Users,
};

function NavIcon({ name }: { name: string }) {
  const Icon = ICONS[name] ?? Layers;
  return <Icon className="size-4 shrink-0" aria-hidden />;
}

function groupNav(nav: AdminNavItem[]) {
  const sections = new Map<string, AdminNavItem[]>();
  for (const item of nav) {
    const list = sections.get(item.section) ?? [];
    list.push(item);
    sections.set(item.section, list);
  }
  return [...sections.entries()];
}

export function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [config, setConfig] = useState<AdminPortalConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [configError, setConfigError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadConfig = useCallback(() => {
    setConfigStatus('loading');
    setConfigError(null);
    return fetchAdminConfig()
      .then((next) => {
        setConfig(next);
        setConfigStatus('ready');
      })
      .catch((error: unknown) => {
        setConfig(null);
        setConfigStatus('error');
        setConfigError(
          safeMessage(
            error instanceof Error ? error.message : '',
            'Failed to load admin navigation. Check your connection and try again.',
          ),
        );
      });
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Session expiry can be raised by any adminFetch call (config, page data, actions).
  useEffect(() => {
    function onSessionExpired() {
      notify.warning('Your session has expired. Please sign in again.');
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [navigate, location.pathname]);

  const navGroups = useMemo(() => groupNav(config?.nav ?? []), [config]);

  const shellContext = useMemo<AdminShellContext>(
    () => ({ config, configStatus, configError, retryConfig: () => void loadConfig() }),
    [config, configStatus, configError, loadConfig],
  );

  function logout() {
    clearAdminToken();
    navigate('/login');
  }

  return (
    <div className="admin-app">
      <a href="#admin-main-content" className="skip-link">
        Skip to main content
      </a>

      {mobileNavOpen ? (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn('admin-sidebar', mobileNavOpen && 'admin-sidebar--open')}
        aria-label="Admin navigation"
      >
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__mark" aria-hidden>
            C
          </span>
          <p className="admin-sidebar__title">{config?.brand.name ?? 'CardOrbit Admin'}</p>
          <p className="admin-sidebar__tagline">{config?.brand.tagline ?? 'Operations console'}</p>
        </div>
        <nav className="admin-sidebar__nav" aria-label="Admin sections">
          {configStatus === 'loading' && navGroups.length === 0 ? (
            <div className="admin-loading" role="status">
              <span className="admin-loading__dot" />
              <span className="admin-loading__dot" />
              <span className="admin-loading__dot" />
              Loading navigation…
            </div>
          ) : configStatus === 'error' && navGroups.length === 0 ? (
            <div className="flex flex-col gap-2 px-2 text-sm text-muted-foreground">
              <p>Navigation failed to load.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadConfig()}>
                Retry
              </Button>
            </div>
          ) : (
            navGroups.map(([section, items]) => (
              <div key={section} className="admin-sidebar__section">
                <p className="admin-sidebar__section-label">{section}</p>
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          cn('admin-sidebar__link', isActive && 'is-active')
                        }
                      >
                        <NavIcon name={item.icon} />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>
        <div className="admin-sidebar__footer">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={logout}>
            Log out
          </Button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="admin-topbar__menu"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? (
              <X className="size-4" aria-hidden />
            ) : (
              <Menu className="size-4" aria-hidden />
            )}
            <span className="sr-only">Toggle navigation</span>
          </Button>
          <p className="admin-topbar__hint">Config-driven operations · Real-time sync</p>
        </header>
        {configStatus === 'error' && config === null ? (
          <div className="admin-session-banner" role="alert">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" aria-hidden />
              Couldn&apos;t load admin navigation. Some pages may be unavailable.
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadConfig()}>
              Retry
            </Button>
          </div>
        ) : null}
        <main id="admin-main-content" className="admin-content animate-admin-enter" tabIndex={-1}>
          <Outlet context={shellContext} />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
