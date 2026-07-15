import { Skeleton } from '@cardwise/ui';

export function MerchantListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul
      className="divide-y divide-white/5 rounded-2xl border border-white/8 bg-card/50"
      aria-busy="true"
      aria-label="Loading merchants"
    >
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="space-y-2 p-4">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-4 w-32" />
        </li>
      ))}
    </ul>
  );
}

export function CatalogListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul
      className="divide-y divide-white/5 rounded-2xl border border-white/8 bg-card/50"
      aria-busy="true"
      aria-label="Loading card catalog"
    >
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-56 max-w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-24 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function PortfolioGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Loading portfolio">
      {Array.from({ length: cards }, (_, index) => (
        <li key={index} className="space-y-3 rounded-2xl border border-white/8 bg-card/50 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-xs" />
        </li>
      ))}
    </ul>
  );
}

export function RecommendationPanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading recommendation">
      <Skeleton className="h-4 w-36" />
      <div className="flex gap-4">
        <Skeleton className="size-[4.75rem] shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-full max-w-xs" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}

export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your home">
      <div className="space-y-3 rounded-2xl border border-white/8 bg-card/50 p-5 sm:p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-white/8 bg-card/50 p-5">
          <RecommendationPanelSkeleton />
        </div>
        <div className="space-y-3 rounded-2xl border border-white/8 bg-card/50 p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function AccountRouteSkeleton() {
  return (
    <div className="consumer-page mx-auto max-w-5xl space-y-6 px-4 py-10" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <MerchantListSkeleton rows={4} />
    </div>
  );
}
