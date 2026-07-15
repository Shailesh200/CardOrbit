import {
  BarChart3,
  CreditCard,
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
import { useEffect, useMemo, useState } from 'react';
import type { AdminNavItem, AdminPortalConfig } from '@cardwise/admin-config';

import { clearAdminToken, fetchAdminConfig } from '../lib/api';

const ICONS: Record<string, LucideIcon> = {
  'chart-bar': BarChart3,
  'refresh-cw': RefreshCw,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    void fetchAdminConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const navGroups = useMemo(() => groupNav(config?.nav ?? []), [config]);

  function logout() {
    clearAdminToken();
    navigate('/login');
  }

  return (
    <div className="admin-app">
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
          {navGroups.map(([section, items]) => (
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
          ))}
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
        <main className="admin-content animate-admin-enter">
          <Outlet context={{ config }} />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
