import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import {
  BarChart3,
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Plane,
  Receipt,
  Settings,
  Store,
  Tag,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, cn } from '@cardwise/ui';

import { DASHBOARD_PATH } from '../features/dashboard/dashboard-path';
import { useNavFeatureFlags } from '../features/navigation/use-nav-feature-flags';

type NavFlagKey = keyof ReturnType<typeof useNavFeatureFlags>;

const primaryTabs: Array<{
  id: string;
  to?: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}> = [
  { id: 'dashboard', to: DASHBOARD_PATH, label: 'Home', icon: LayoutDashboard, end: true },
  { id: 'cards', to: '/account/cards', label: 'Cards', icon: CreditCard },
  { id: 'merchants', to: '/account/merchants', label: 'Merchants', icon: Store },
  { id: 'more', label: 'More', icon: Menu },
];

const moreGroupsBase: Array<{
  label: string;
  links: Array<{
    to: string;
    label: string;
    icon: LucideIcon;
    end?: boolean;
    flagKey?: NavFlagKey;
  }>;
}> = [
  {
    label: 'Cards & spend',
    links: [
      { to: '/account/offers', label: 'Offers', icon: Tag },
      { to: '/account/rewards', label: 'Rewards', icon: Wallet },
      { to: '/account/transactions', label: 'Transactions', icon: Receipt },
    ],
  },
  {
    label: 'Planning',
    links: [
      { to: '/account/calendar', label: 'Calendar', icon: CalendarDays, flagKey: 'calendar' },
      { to: '/account/billing', label: 'Billing', icon: FileText },
      { to: '/account/travel', label: 'Travel', icon: Plane, flagKey: 'travel' },
      { to: '/account/reports', label: 'Reports', icon: BarChart3, flagKey: 'reports' },
    ],
  },
  {
    label: 'Account',
    links: [
      { to: '/account/notifications', label: 'Notifications', icon: Bell },
      { to: '/account/profile', label: 'Profile', icon: UserRound },
      { to: '/account/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function isPrimaryActive(pathname: string, to: string, end?: boolean): boolean {
  if (end) return pathname === to || pathname === `${to}/`;
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Fixed bottom tab bar for mobile / installed PWA (M-024). */
export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const flags = useNavFeatureFlags();

  const moreGroups = moreGroupsBase
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => !link.flagKey || flags[link.flagKey]),
    }))
    .filter((group) => group.links.length > 0);
  const moreLinks = moreGroups.flatMap((group) => group.links);
  const moreActive = moreLinks.some(({ to, end }) => isPrimaryActive(location.pathname, to, end));

  return (
    <>
      <nav className="consumer-bottom-nav lg:hidden" aria-label="Primary mobile">
        {primaryTabs.map(({ id, to, label, icon: Icon, end }) => {
          if (id === 'more') {
            return (
              <button
                key={id}
                type="button"
                className={cn('consumer-bottom-nav__item', moreActive && 'is-active')}
                aria-label="More navigation"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen(true)}
              >
                <Icon className="size-5" aria-hidden />
                <span>{label}</span>
              </button>
            );
          }

          const active = to ? isPrimaryActive(location.pathname, to, end) : false;
          return (
            <NavLink
              key={id}
              to={to!}
              end={end}
              className={cn('consumer-bottom-nav__item', active && 'is-active')}
            >
              <Icon className="size-5" aria-hidden />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader className="border-b border-border/60 px-4 py-4 text-left">
            <DialogTitle className="font-display text-lg">More</DialogTitle>
          </DialogHeader>
          <nav className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-2">
            {moreGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
                {group.links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn('consumer-mobile-nav-link', isActive && 'is-active')
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
