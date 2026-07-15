import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, Input } from '@cardwise/ui';
import { Check, Loader2, SearchX } from 'lucide-react';

import { EmptyState } from '../../components/feedback/EmptyState';
import { CatalogListSkeleton } from '../../components/feedback/PageSkeletons';
import { PageBackLink } from '@layout/PageBackLink';
import { toast } from '@lib/app-toast';

import { addPortfolioCard, listCatalog, type CatalogCard } from './portfolio-api';
import { AiSearchHint } from '../ai/components/AiSearchHint';
import { AiVisual } from '../ai/components/AiVisual';
import { AiSearchBadge } from '../search/components/AiSearchBadge';
import type { AiSearchSource } from '../search/search-api';

const PAGE_SIZE = 20;

export function AddCardPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogCard[]>([]);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [total, setTotal] = useState(0);
  const [searchSource, setSearchSource] = useState<AiSearchSource | undefined>();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (opts: { q: string; offset: number; append: boolean }) => {
    const page = await listCatalog({
      q: opts.q || undefined,
      offset: opts.offset,
      limit: PAGE_SIZE,
    });
    setItems((prev) => (opts.append ? [...prev, ...page.items] : page.items));
    setHasMore(page.hasMore);
    setNextOffset(page.nextOffset);
    setTotal(page.total);
    setSearchSource(page.source);
    return page;
  }, []);

  useEffect(() => {
    document.title = 'CardOrbit · Add card';
    setLoading(true);
    void fetchPage({ q: '', offset: 0, append: false })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [fetchPage]);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    setActiveQuery(q);
    setLoading(true);
    try {
      await fetchPage({ q, offset: 0, append: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || nextOffset === null) return;
    setLoadingMore(true);
    try {
      await fetchPage({ q: activeQuery, offset: nextOffset, append: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load more cards');
    } finally {
      setLoadingMore(false);
    }
  }, [activeQuery, fetchPage, hasMore, loadingMore, nextOffset]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  async function onAdd(card: CatalogCard) {
    if (card.inPortfolio && card.userCardId) {
      navigate(`/account/cards/${card.userCardId}`);
      return;
    }
    setBusyId(card.id);
    try {
      const added = await addPortfolioCard({ creditCardId: card.id });
      toast.success(`${card.name} added to your portfolio`);
      navigate(`/account/cards/${added.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add card');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageBackLink to="/account/cards" label="Back to portfolio" />
        <div className="flex flex-wrap items-start gap-4">
          <AiVisual
            variant="search"
            className="hidden shrink-0 md:block"
            illustrationClassName="h-24 w-32"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Catalog
            </p>
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              Add a card
            </h1>
            <p className="text-sm text-muted-foreground">
              Search the AI-organized catalog by card name, bank, or benefit keywords like &quot;0%
              forex&quot; or &quot;lounge access&quot;.
            </p>
          </div>
        </div>
      </div>

      <form className="flex gap-2" onSubmit={onSearch}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards, banks, or benefits (e.g. 0% forex)"
          aria-label="Search catalog"
        />
        <Button type="submit" variant="outline" disabled={loading}>
          Search
        </Button>
      </form>

      <AiSearchHint context="catalog" />

      {!loading && total > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Showing {items.length} of {total} card{total === 1 ? '' : 's'}
            {activeQuery ? ` matching “${activeQuery}”` : ''}
            {searchSource === 'semantic' ? ' · ranked by meaning' : ''}
            {searchSource === 'keyword' && activeQuery ? ' · keyword match' : ''}
          </p>
          {activeQuery ? (
            <AiSearchBadge source={searchSource} visible={Boolean(activeQuery)} />
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <CatalogListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No cards match your search"
          description={
            activeQuery
              ? `Try a shorter query or describe what you want, e.g. “travel cashback”.`
              : 'The catalog is empty or unavailable right now.'
          }
          action={
            activeQuery ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery('');
                  setActiveQuery('');
                  setLoading(true);
                  void fetchPage({ q: '', offset: 0, append: false })
                    .catch((error: Error) => toast.error(error.message))
                    .finally(() => setLoading(false));
                }}
              >
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60">
            {items.map((card) => (
              <li
                key={card.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {card.bank.name} · {card.network.name}
                  </p>
                  <p className="font-display text-base font-semibold tracking-tight">{card.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {card.benefitCount} benefits
                    {card.annualFeeInr && Number(card.annualFeeInr) > 0
                      ? ` · ₹${card.annualFeeInr} annual fee`
                      : ' · No annual fee listed'}
                  </p>
                </div>
                {card.inPortfolio ? (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/account/cards/${card.userCardId}`}>
                      <Check className="size-4" />
                      In portfolio
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="btn-premium shrink-0"
                    disabled={busyId === card.id}
                    onClick={() => onAdd(card)}
                  >
                    {busyId === card.id ? 'Adding…' : 'Add to portfolio'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div ref={sentinelRef} className="flex justify-center py-4" aria-hidden={!hasMore}>
            {loadingMore ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : hasMore ? (
              <span className="text-xs text-muted-foreground">Scroll for more…</span>
            ) : items.length > PAGE_SIZE ? (
              <span className="text-xs text-muted-foreground">End of catalog</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
