import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@cardwise/ui';
import type { LucideIcon } from 'lucide-react';

import { getUnreadNotificationCount } from './notifications-api';

export function NotificationsNavLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
}) {
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    void getUnreadNotificationCount()
      .then((data) => setUnread(data.count))
      .catch(() => undefined);
  }, [location.pathname]);

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('consumer-sidebar-link consumer-sidebar-link--with-badge', isActive && 'is-active')
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
      {unread > 0 ? (
        <span className="consumer-sidebar-badge" aria-label={`${unread} unread notifications`}>
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </NavLink>
  );
}
