import { CreditCard, Store } from 'lucide-react';
import { cn } from '@cardwise/ui';
import type { ComponentType, ReactNode } from 'react';

import type { AssistantResultItem } from '../types';

type LinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function AiAssistantResultCards({
  results,
  resolveResultHref,
  LinkComponent,
  onNavigate,
}: {
  results: AssistantResultItem[];
  resolveResultHref?: (result: AssistantResultItem) => string | null;
  LinkComponent?: ComponentType<LinkProps>;
  onNavigate?: (href: string) => void;
}) {
  if (results.length === 0) return null;

  const Link = LinkComponent ?? 'a';
  const cardResults = results.filter((result) => result.kind !== 'merchant');
  const merchantResults = results.filter((result) => result.kind === 'merchant');

  return (
    <div className="mt-3 space-y-3">
      {cardResults.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Cards that match your ask
          </p>
          <div className="space-y-2">
            {cardResults.map((result) => (
              <ResultCard
                key={`${result.kind}-${result.slug}`}
                result={result}
                href={resolveResultHref?.(result) ?? null}
                LinkComponent={Link}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ) : null}
      {merchantResults.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Related merchants
          </p>
          <div className="space-y-2">
            {merchantResults.map((result) => (
              <ResultCard
                key={`${result.kind}-${result.slug}`}
                result={result}
                href={resolveResultHref?.(result) ?? null}
                LinkComponent={Link}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultCard({
  result,
  href,
  LinkComponent: Link,
  onNavigate,
}: {
  result: AssistantResultItem;
  href: string | null;
  LinkComponent: ComponentType<LinkProps> | 'a';
  onNavigate?: (href: string) => void;
}) {
  const isMerchant = result.kind === 'merchant';
  const Icon = isMerchant ? Store : CreditCard;
  const highlights = (result.highlights ?? []).filter((line) => !/^\d+\s+benefits?$/i.test(line));

  const body = (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-border/60 bg-background/80 p-3 transition-colors',
        href && 'hover:border-primary/25 hover:bg-muted/30',
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          isMerchant
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-xs font-semibold tracking-tight">{result.title}</p>
          {result.badge ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {result.badge}
            </span>
          ) : null}
          {result.inPortfolio && !result.badge ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              In portfolio
            </span>
          ) : null}
        </div>
        {result.subtitle ? (
          <p className="text-[11px] text-muted-foreground">{result.subtitle}</p>
        ) : null}
        {highlights.length > 0 ? (
          <ul className="space-y-0.5">
            {highlights.slice(0, 4).map((line) => (
              <li key={line} className="text-[11px] leading-snug text-foreground/90">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {isMerchant
              ? 'Open for category and reward context.'
              : 'Open the card for fees, rewards, and lounge details.'}
          </p>
        )}
        {href ? (
          <p className="text-[10px] font-medium text-primary">
            {isMerchant ? 'View merchant' : result.inPortfolio ? 'View card' : 'Browse catalog'}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!href) {
    return <div>{body}</div>;
  }

  return (
    <Link href={href} className="block no-underline" onClick={() => onNavigate?.(href)}>
      {body}
    </Link>
  );
}
