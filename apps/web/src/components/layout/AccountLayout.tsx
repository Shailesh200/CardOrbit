import { NavLink, Outlet } from 'react-router';
import { cn } from '@cardwise/ui';
import {
  BarChart3,
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  Library,
  Plane,
  Receipt,
  Settings,
  Store,
  Tag,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { DASHBOARD_PATH } from '../../features/dashboard/dashboard-path';
import { NotificationsNavLink } from '../../features/notifications/NotificationsNavLink';
import { useNavFeatureFlags } from '../../features/navigation/use-nav-feature-flags';

type NavFlagKey = keyof ReturnType<typeof useNavFeatureFlags>;

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  custom?: boolean;
  /** Hides this entry when the flag resolves to false. */
  flagKey?: NavFlagKey;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Grouped, priority-ordered sidebar.
 * Nested destinations (milestones, cashback, redemptions, benefits, premium,
 * insights, history) stay reachable from Cards / Rewards / Reports / Merchants.
 */
const navGroups: NavGroup[] = [
  {
    label: 'Home',
    items: [{ to: DASHBOARD_PATH, label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Cards & spend',
    items: [
      { to: '/account/cards', label: 'Cards', icon: CreditCard, end: true },
      { to: '/account/cards/explore', label: 'Explore', icon: Library },
      { to: '/account/cards/compare', label: 'Compare', icon: GitCompareArrows },
      { to: '/account/merchants', label: 'Merchants', icon: Store },
      { to: '/account/offers', label: 'Offers', icon: Tag },
      { to: '/account/rewards', label: 'Rewards', icon: Wallet },
      { to: '/account/transactions', label: 'Transactions', icon: Receipt },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/account/calendar', label: 'Calendar', icon: CalendarDays, flagKey: 'calendar' },
      { to: '/account/billing', label: 'Billing', icon: FileText },
      { to: '/account/travel', label: 'Travel', icon: Plane, flagKey: 'travel' },
      { to: '/account/reports', label: 'Reports', icon: BarChart3, flagKey: 'reports' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/account/notifications', label: 'Notifications', icon: Bell, custom: true },
      { to: '/account/profile', label: 'Profile', icon: UserRound },
      { to: '/account/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AccountLayout() {
  const flags = useNavFeatureFlags();
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.flagKey || flags[item.flagKey]),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="consumer-page mx-auto flex max-w-5xl flex-col gap-8 py-6 lg:py-10 lg:flex-row lg:items-start lg:gap-10">
      <aside className="consumer-sidebar hidden lg:block lg:w-56 lg:shrink-0">
        <nav className="consumer-sidebar-nav flex max-h-[calc(100dvh-var(--shell-sticky-rail-top)-1.5rem)] flex-col gap-4 overflow-y-auto overscroll-contain">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="consumer-sidebar-label">{group.label}</p>
              <div className="flex flex-col gap-1">
                {group.items.map(({ to, label, icon: Icon, end, custom }) =>
                  custom ? (
                    <NotificationsNavLink key={to} to={to} label={label} icon={Icon} />
                  ) : (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn('consumer-sidebar-link', isActive && 'is-active')
                      }
                    >
                      <Icon className="size-4" />
                      {label}
                    </NavLink>
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="consumer-surface consumer-surface-accent consumer-surface--glass min-w-0 flex-1 animate-fade-in-up p-6 sm:p-8">
        <Outlet />
      </div>
    </div>
  );
}
