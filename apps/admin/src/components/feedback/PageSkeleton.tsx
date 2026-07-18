import { Skeleton } from '@cardwise/ui';

/** Route/page loading placeholders — prefer these over ad-hoc "Loading…" text. */
export function PageHeroSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="admin-panel admin-table-skeleton" aria-busy="true" aria-label="Loading records">
      <Skeleton className="h-4 w-40" />
      <div className="admin-table-skeleton__rows">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="admin-stat-grid" aria-busy="true" aria-label="Loading stats">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="admin-panel admin-stat admin-stat-skeleton">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
