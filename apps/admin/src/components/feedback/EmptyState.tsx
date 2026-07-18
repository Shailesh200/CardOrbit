import type { ReactNode } from 'react';
import { cn } from '@cardwise/ui';
import { Inbox, type LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/** Use for genuinely empty collections — never for load failures (see LoadErrorState). */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('admin-empty-state', className)}>
      <Icon className="admin-empty-state__icon" aria-hidden />
      <p className="admin-empty-state__title">{title}</p>
      {description ? <p className="admin-empty-state__desc">{description}</p> : null}
      {action}
    </div>
  );
}
