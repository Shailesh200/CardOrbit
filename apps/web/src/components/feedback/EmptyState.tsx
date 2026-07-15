import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@cardwise/ui';

type EmptyStateProps = {
  icon?: LucideIcon;
  /** Optional branded visual (SVG, Lottie) shown instead of the Lucide icon. */
  visual?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

/** Branded dashed empty panel — portfolio, search, recommendations (M-024). */
export function EmptyState({
  icon: Icon,
  visual,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'consumer-empty-state flex flex-col items-center gap-4 rounded-2xl border border-dashed border-primary/25 bg-card/60 px-6 py-12 text-center backdrop-blur-sm',
        className,
      )}
    >
      {visual ?? (Icon ? <Icon className="size-10 text-primary/70" aria-hidden /> : null)}
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold tracking-tight">{title}</p>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action || secondaryAction ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
