import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button, Input } from '@cardwise/ui';
import { BookmarkPlus, Loader2, SearchX, Trash2, X } from 'lucide-react';

import { EmptyState } from '../../components/feedback/EmptyState';
import { MerchantListSkeleton } from '../../components/feedback/PageSkeletons';
import { PageBackLink } from '@layout/PageBackLink';
import { notify, toast } from '@lib/app-toast';
import { trackSavedSearchCreatedClient, trackSavedSearchRunClient } from '@lib/product-analytics';

import { MerchantSearchAutocomplete } from './components/MerchantSearchAutocomplete';
import {
  createSavedSearch,
  deleteSavedSearch,
  listMerchantCategories,
  listPopularMerchants,
  listSavedSearches,
  searchMerchants,
  type MerchantCategory,
  type MerchantListItem,
  type SavedSearch,
} from './merchants-api';
import { getRecentMerchants, type RecentMerchant } from './recent-searches';
import { AiSearchHint } from '../ai/components/AiSearchHint';
import { AiVisual } from '../ai/components/AiVisual';
import { AiSearchBadge } from '../search/components/AiSearchBadge';
import type { AiSearchSource } from '../search/search-api';

const PAGE_SIZE = 20;

export function MerchantSearchPage() {
  const [items, setItems] = useState<MerchantListItem[]>([]);
  const [categories, setCategories] = useState<MerchantCategory[]>([]);
  const [popular, setPopular] = useState<MerchantListItem[]>([]);
  const [recent, setRecent] = useState<RecentMerchant[]>([]);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [total, setTotal] = useState(0);
  const [searchSource, setSearchSource] = useState<AiSearchSource | undefined>();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savePending, setSavePending] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (opts: { q: string; categorySlug: string | null; offset: number; append: boolean }) => {
      const page = await searchMerchants({
        q: opts.q || undefined,
        categorySlug: opts.categorySlug || undefined,
        offset: opts.offset,
        limit: PAGE_SIZE,
      });
      setItems((prev) => (opts.append ? [...prev, ...page.items] : page.items));
      setHasMore(page.hasMore);
      setNextOffset(page.nextOffset);
      setTotal(page.total);
      setSearchSource(page.source);
      return page;
    },
    [],
  );

  useEffect(() => {
    document.title = 'CardOrbit · Find merchant';
    setRecent(getRecentMerchants());
    setLoading(true);
    Promise.all([
      listMerchantCategories(),
      listPopularMerchants(),
      listSavedSearches().catch(() => [] as SavedSearch[]),
      fetchPage({ q: '', categorySlug: null, offset: 0, append: false }),
    ])
      .then(([categoryRows, popularRows, savedRows]) => {
        setCategories(categoryRows);
        setPopular(popularRows);
        setSavedSearches(savedRows);
      })
      .catch((error: Error) => notify.fromError(error))
      .finally(() => setLoading(false));
  }, [fetchPage]);

  async function runSearch() {
    const q = query.trim();
    setActiveQuery(q);
    setLoading(true);
    try {
      await fetchPage({ q, categorySlug, offset: 0, append: false });
    } catch (error) {
      notify.fromError(error, 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    await runSearch();
  }

  async function onCategoryChange(slug: string | null) {
    setCategorySlug(slug);
    setLoading(true);
    try {
      await fetchPage({ q: activeQuery, categorySlug: slug, offset: 0, append: false });
    } catch (error) {
      notify.fromError(error, 'Could not filter merchants');
    } finally {
      setLoading(false);
    }
  }

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || nextOffset === null) return;
    setLoadingMore(true);
    try {
      await fetchPage({
        q: activeQuery,
        categorySlug,
        offset: nextOffset,
        append: true,
      });
    } catch (error) {
      notify.fromError(error, 'Could not load more merchants');
    } finally {
      setLoadingMore(false);
    }
  }, [activeQuery, categorySlug, fetchPage, hasMore, loadingMore, nextOffset]);

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

  const canSaveSearch = Boolean(activeQuery || categorySlug);

  async function onSaveSearch(event: FormEvent) {
    event.preventDefault();
    const name = saveName.trim();
    if (!name || !canSaveSearch) return;

    setSavePending(true);
    try {
      const saved = await createSavedSearch({
        name,
        query: activeQuery,
        categorySlug,
      });
      setSavedSearches((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)]);
      setSaveDialogOpen(false);
      setSaveName('');
      trackSavedSearchCreatedClient({
        savedSearchId: saved.id,
        name: saved.name,
        query: saved.query,
        categorySlug: saved.categorySlug,
      });
      toast.success('Search saved');
    } catch (error) {
      notify.fromError(error, 'Could not save search');
    } finally {
      setSavePending(false);
    }
  }

  async function runSavedSearch(saved: SavedSearch) {
    setQuery(saved.query);
    setActiveQuery(saved.query);
    setCategorySlug(saved.categorySlug);
    setLoading(true);
    try {
      const page = await fetchPage({
        q: saved.query,
        categorySlug: saved.categorySlug,
        offset: 0,
        append: false,
      });
      trackSavedSearchRunClient({
        savedSearchId: saved.id,
        name: saved.name,
        query: saved.query,
        categorySlug: saved.categorySlug,
        resultCount: page?.total,
      });
    } catch (error) {
      notify.fromError(error, 'Could not run saved search');
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteSavedSearch(savedSearchId: string) {
    try {
      await deleteSavedSearch(savedSearchId);
      setSavedSearches((prev) => prev.filter((row) => row.id !== savedSearchId));
      toast.success('Saved search removed');
    } catch (error) {
      notify.fromError(error, 'Could not delete saved search');
    }
  }

  const showBrowseExtras = !activeQuery && !categorySlug;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageBackLink to="/account" label="Back to dashboard" />
        <div className="flex flex-wrap items-start gap-4">
          <AiVisual
            variant="search"
            className="hidden shrink-0 md:block"
            illustrationClassName="h-24 w-32"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Merchants
            </p>
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              Find a merchant
            </h1>
            <p className="text-sm text-muted-foreground">
              {total > 0
                ? `Search ${total.toLocaleString()} merchants with keywords or natural phrases — AI ranks results by meaning when enabled.`
                : 'Search merchants by name or keywords to see AI-explained best-card picks before checkout.'}
            </p>
          </div>
        </div>
      </div>

      <form className="flex gap-2" onSubmit={onSearch}>
        <MerchantSearchAutocomplete
          value={query}
          onChange={setQuery}
          onSubmit={() => void runSearch()}
          disabled={loading}
        />
        <Button type="submit" variant="outline" disabled={loading}>
          Search
        </Button>
      </form>

      <AiSearchHint context="merchant" />

      {savedSearches.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Saved searches</h2>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((saved) => (
              <div
                key={saved.id}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 pl-3"
              >
                <button
                  type="button"
                  className="py-2 text-sm font-medium text-foreground hover:text-primary"
                  onClick={() => void runSavedSearch(saved)}
                >
                  {saved.name}
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete saved search ${saved.name}`}
                  onClick={() => void onDeleteSavedSearch(saved.id)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canSaveSearch ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSaveName(
                activeQuery || categories.find((c) => c.slug === categorySlug)?.name || 'My search',
              );
              setSaveDialogOpen(true);
            }}
          >
            <BookmarkPlus className="size-4" />
            Save search
          </Button>
        </div>
      ) : null}

      {saveDialogOpen ? (
        <form
          className="consumer-surface flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 p-4"
          onSubmit={onSaveSearch}
        >
          <div className="min-w-[12rem] flex-1 space-y-1">
            <label htmlFor="saved-search-name" className="text-sm font-medium">
              Name this search
            </label>
            <Input
              id="saved-search-name"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="e.g. Food delivery"
              maxLength={80}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={savePending || !saveName.trim()}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSaveDialogOpen(false)}
            >
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={categorySlug === null ? 'default' : 'outline'}
            onClick={() => void onCategoryChange(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant={categorySlug === category.slug ? 'default' : 'outline'}
              onClick={() => void onCategoryChange(category.slug)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      ) : null}

      {showBrowseExtras && recent.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Recently searched</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((merchant) => (
              <Button key={merchant.slug} asChild size="sm" variant="outline">
                <Link to={`/account/merchants/${merchant.slug}`}>{merchant.name}</Link>
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {showBrowseExtras && popular.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Popular merchants</h2>
          <div className="flex flex-wrap gap-2">
            {popular.map((merchant) => (
              <Button key={merchant.id} asChild size="sm" variant="outline">
                <Link to={`/account/merchants/${merchant.slug}`}>{merchant.name}</Link>
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && total > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Showing {items.length} of {total} merchant{total === 1 ? '' : 's'}
            {activeQuery ? ` matching “${activeQuery}”` : ''}
            {searchSource === 'semantic' && activeQuery && !categorySlug
              ? ' · ranked by meaning'
              : ''}
            {searchSource === 'keyword' && activeQuery && !categorySlug ? ' · keyword match' : ''}
            {categorySlug
              ? ` in ${categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug.replaceAll(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`
              : ''}
          </p>
          {activeQuery && !categorySlug ? (
            <AiSearchBadge source={searchSource} visible={Boolean(activeQuery)} />
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <MerchantListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={activeQuery ? 'No merchants found' : 'No merchants in this category'}
          description={
            activeQuery
              ? `We couldn't find merchants matching “${activeQuery}”. Try natural language like “food delivery app”.`
              : 'Try another category or search by merchant name.'
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
                  void fetchPage({ q: '', categorySlug, offset: 0, append: false })
                    .catch((error: Error) => notify.fromError(error))
                    .finally(() => setLoading(false));
                }}
              >
                Clear search
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => void onCategoryChange(null)}>
                View all merchants
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60">
            {items.map((merchant) => (
              <li key={merchant.id}>
                <Link
                  to={`/account/merchants/${merchant.slug}`}
                  className="flex flex-col gap-1 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-display text-base font-semibold tracking-tight">
                      {merchant.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {merchant.category?.name ?? 'Uncategorized'}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-primary">View details</span>
                </Link>
              </li>
            ))}
          </ul>
          <div ref={sentinelRef} className="flex justify-center py-4" aria-hidden={!hasMore}>
            {loadingMore ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : hasMore ? (
              <span className="text-xs text-muted-foreground">Scroll for more…</span>
            ) : items.length > PAGE_SIZE ? (
              <span className="text-xs text-muted-foreground">End of directory</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
