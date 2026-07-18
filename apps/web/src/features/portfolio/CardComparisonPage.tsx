import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeftRight, Sparkles, Star } from 'lucide-react';

import { MiniCreditCard } from '@brand/MiniCreditCard';
import { PageBackLink } from '@layout/PageBackLink';
import { notify, toast } from '@lib/app-toast';

import {
  buildComparisonIdsParam,
  compareCatalogCards,
  comparePortfolioCards,
  COMPARISON_GROUP_LABELS,
  MAX_COMPARISON_CARDS,
  MIN_COMPARISON_CARDS,
  parseComparisonIdsParam,
  type CardComparisonResult,
  type ComparisonRow,
} from './card-comparison-api';
import { listPortfolio, type PortfolioCardSummary } from './portfolio-api';

type SortMode = 'portfolio' | 'fee-asc' | 'reward-desc';

function ComparisonTable({
  result,
  differencesOnly,
}: {
  result: CardComparisonResult;
  differencesOnly: boolean;
}) {
  const rows = differencesOnly ? result.rows.filter((row) => row.isDifferent) : result.rows;
  const groups = ['fees', 'rewards', 'benefits', 'lifestyle'] as const;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All selected cards match on every tracked metric.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-semibold">
              Metric
            </th>
            {result.columns.map((column) => (
              <th key={column.userCardId} className="min-w-[10rem] px-4 py-3 text-left">
                <div className="flex items-start gap-2">
                  <MiniCreditCard
                    bankSlug={column.bankSlug}
                    cardSlug={column.cardSlug}
                    cardName={column.cardName}
                    className="w-[3rem] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{column.nickname ?? column.cardName}</p>
                    <p className="truncate text-xs text-muted-foreground">{column.bankName}</p>
                    {result.recommendedUserCardId === column.userCardId ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <Sparkles className="size-3" aria-hidden />
                        Best fit
                      </span>
                    ) : null}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const groupRows = rows.filter((row) => row.group === group);
            if (groupRows.length === 0) return null;

            return groupRows.flatMap((row, index) => [
              index === 0 ? (
                <tr key={`${group}-heading`} className="bg-background/80">
                  <td
                    colSpan={result.columns.length + 1}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {COMPARISON_GROUP_LABELS[group]}
                  </td>
                </tr>
              ) : null,
              <ComparisonDataRow
                key={row.id}
                row={row}
                columnIds={result.columns.map((c) => c.userCardId)}
              />,
            ]);
          })}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonDataRow({ row, columnIds }: { row: ComparisonRow; columnIds: string[] }) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">{row.label}</td>
      {columnIds.map((columnId) => {
        const isBest = row.bestUserCardId === columnId;
        return (
          <td
            key={columnId}
            className={`px-4 py-3 align-top ${isBest ? 'bg-primary/5 font-semibold text-primary' : ''}`}
          >
            {row.values[columnId] ?? '—'}
          </td>
        );
      })}
    </tr>
  );
}

export function CardComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const catalogMode = Boolean(searchParams.get('catalogIds'));
  const [portfolio, setPortfolio] = useState<PortfolioCardSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    parseComparisonIdsParam(searchParams.get(catalogMode ? 'catalogIds' : 'ids')),
  );
  const [result, setResult] = useState<CardComparisonResult | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('portfolio');

  useEffect(() => {
    document.title = 'CardOrbit · Compare cards';
    if (catalogMode) {
      setLoadingPortfolio(false);
      return;
    }
    listPortfolio()
      .then(setPortfolio)
      .catch((error: Error) => notify.fromError(error))
      .finally(() => setLoadingPortfolio(false));
  }, [catalogMode]);

  const runComparison = useCallback(
    async (ids: string[]) => {
      if (ids.length < MIN_COMPARISON_CARDS) {
        setResult(null);
        return;
      }

      setComparing(true);
      try {
        const data = catalogMode
          ? await compareCatalogCards(ids)
          : await comparePortfolioCards(ids);
        setResult(data);
      } catch (error) {
        setResult(null);
        notify.fromError(error, 'Comparison failed');
      } finally {
        setComparing(false);
      }
    },
    [catalogMode],
  );

  useEffect(() => {
    if (selectedIds.length >= MIN_COMPARISON_CARDS) {
      void runComparison(selectedIds);
    } else {
      setResult(null);
    }
  }, [selectedIds, runComparison]);

  useEffect(() => {
    const next = buildComparisonIdsParam(selectedIds);
    const key = catalogMode ? 'catalogIds' : 'ids';
    if (next !== (searchParams.get(key) ?? '')) {
      setSearchParams(next ? { [key]: next } : {}, { replace: true });
    }
  }, [selectedIds, searchParams, setSearchParams, catalogMode]);

  function toggleCard(userCardId: string) {
    setSelectedIds((current) => {
      if (current.includes(userCardId)) {
        return current.filter((id) => id !== userCardId);
      }
      if (current.length >= MAX_COMPARISON_CARDS) {
        toast.error(`Compare up to ${MAX_COMPARISON_CARDS} cards at once`);
        return current;
      }
      return [...current, userCardId];
    });
  }

  const sortedResult = useMemo(() => {
    if (!result) return null;

    const columns = [...result.columns];
    if (sortMode === 'fee-asc') {
      const feeRow = result.rows.find((row) => row.id === 'annual-fee');
      columns.sort((a, b) => {
        const aVal = parseFeeValue(feeRow?.values[a.userCardId]);
        const bVal = parseFeeValue(feeRow?.values[b.userCardId]);
        return aVal - bVal;
      });
    } else if (sortMode === 'reward-desc') {
      const rewardRow = result.rows.find((row) => row.id === 'reward-rate');
      columns.sort((a, b) => {
        const aVal = parseRewardValue(rewardRow?.values[a.userCardId]);
        const bVal = parseRewardValue(rewardRow?.values[b.userCardId]);
        return bVal - aVal;
      });
    }

    return { ...result, columns };
  }, [result, sortMode]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <PageBackLink to="/account/cards" label="Back to portfolio" />
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary" aria-hidden>
            <ArrowLeftRight className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Card comparison
            </p>
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              Compare cards side by side
            </h1>
            <p className="text-sm text-muted-foreground">
              {catalogMode
                ? `Comparing ${selectedIds.length} catalog cards on fees, rewards, lounge access, and more.`
                : `Pick ${MIN_COMPARISON_CARDS}–${MAX_COMPARISON_CARDS} portfolio cards to compare fees, rewards, lounge access, insurance, and more.`}
            </p>
            {catalogMode ? (
              <p className="text-sm">
                <Link to="/account/cards/explore" className="text-primary hover:underline">
                  Back to explore
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {catalogMode ? null : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Select cards
          </h2>
          {loadingPortfolio ? (
            <p className="text-sm text-muted-foreground">Loading portfolio…</p>
          ) : portfolio.length < MIN_COMPARISON_CARDS ? (
            <p className="text-sm text-muted-foreground">
              Add at least two cards to your portfolio to compare.{' '}
              <Link to="/account/cards/explore" className="text-primary hover:underline">
                Explore catalog
              </Link>
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {portfolio.map((card) => {
                const selected = selectedIds.includes(card.id);
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => toggleCard(card.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border/60 bg-background/60 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {card.nickname ?? card.card.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {card.card.bank.name}
                          </p>
                        </div>
                        {card.isFavorite ? (
                          <Star className="size-4 shrink-0 fill-primary text-primary" aria-hidden />
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedIds.length} of {MAX_COMPARISON_CARDS} selected
            {selectedIds.length >= MIN_COMPARISON_CARDS ? ' · share this URL to revisit' : ''}
          </p>
        </section>
      )}

      {sortedResult ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={differencesOnly}
                onChange={(event) => setDifferencesOnly(event.target.checked)}
              />
              Show differences only
            </label>
            <label className="flex items-center gap-2 text-sm">
              Sort columns
              <select
                className="rounded-md border border-border/60 bg-background px-2 py-1 text-sm"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                <option value="portfolio">Selection order</option>
                <option value="fee-asc">Lowest annual fee</option>
                <option value="reward-desc">Highest reward rate</option>
              </select>
            </label>
          </div>
          <ComparisonTable result={sortedResult} differencesOnly={differencesOnly} />
        </section>
      ) : comparing ? (
        <p className="text-sm text-muted-foreground">Building comparison…</p>
      ) : selectedIds.length >= MIN_COMPARISON_CARDS ? null : (
        <p className="text-sm text-muted-foreground">
          Select at least {MIN_COMPARISON_CARDS} cards to generate a comparison table.
        </p>
      )}
    </div>
  );
}

function parseFeeValue(value: string | undefined): number {
  if (!value || value === '—') return Number.POSITIVE_INFINITY;
  const digits = value.replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function parseRewardValue(value: string | undefined): number {
  if (!value || value === '—') return 0;
  const match = value.match(/([\d.]+)/);
  return match ? Number.parseFloat(match[1]!) : 0;
}
