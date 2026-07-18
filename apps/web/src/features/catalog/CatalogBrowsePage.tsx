import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cardwise/ui';
import { GitCompareArrows, Search, Store } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify } from '@lib/app-toast';
import { useAuthSWR } from '../../hooks/useAuthSWR';
import { searchCatalog, type CatalogCard } from '../portfolio/portfolio-api';
import {
  buildComparisonIdsParam,
  MAX_COMPARISON_CARDS,
  MIN_COMPARISON_CARDS,
} from '../portfolio/card-comparison-api';

const NETWORKS = ['VISA', 'MASTERCARD', 'RUPAY', 'AMEX'] as const;
const CATEGORIES = ['REWARDS', 'LOUNGE', 'TRAVEL', 'DINING', 'FUEL', 'CASHBACK'] as const;

export function CatalogBrowsePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [bankSlug, setBankSlug] = useState('');
  const [networkCode, setNetworkCode] = useState('');
  const [maxAnnualFeeInr, setMaxAnnualFeeInr] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const listKey = useMemo(
    () => ['catalog-browse', q.trim(), bankSlug, networkCode, maxAnnualFeeInr, category] as const,
    [q, bankSlug, networkCode, maxAnnualFeeInr, category],
  );

  const { data, error, isLoading } = useAuthSWR(listKey, () =>
    searchCatalog(q.trim() || undefined, {
      bankSlug: bankSlug || undefined,
      networkCode: networkCode || undefined,
      maxAnnualFeeInr: maxAnnualFeeInr ? Number(maxAnnualFeeInr) : undefined,
      category: category || undefined,
      limit: 40,
    }),
  );

  useEffect(() => {
    document.title = 'CardOrbit · Explore cards';
  }, []);

  useEffect(() => {
    if (error) notify.fromError(error, 'Could not load catalog');
  }, [error]);

  const items = data?.items ?? [];

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((row) => row !== id);
      if (current.length >= MAX_COMPARISON_CARDS) return current;
      return [...current, id];
    });
  }

  function onCompare() {
    if (selected.length < MIN_COMPARISON_CARDS) return;
    navigate(`/account/cards/compare?catalogIds=${buildComparisonIdsParam(selected)}`);
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <div className="space-y-8">
      <PageBackLink to="/account" label="Dashboard" />

      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Catalog</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              Explore cards
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse issuer-verified cards. Filter by bank, network, fees, and benefit category —
              then compare side by side.
            </p>
          </div>
          <Button
            type="button"
            className="btn-premium"
            disabled={selected.length < MIN_COMPARISON_CARDS}
            onClick={onCompare}
          >
            <GitCompareArrows className="size-4" />
            Compare selected ({selected.length})
          </Button>
        </div>
      </header>

      <form
        onSubmit={onSearchSubmit}
        className="grid gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="catalog-q">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="catalog-q"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Millennia, lounge, forex…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="catalog-bank">Bank slug</Label>
          <Input
            id="catalog-bank"
            value={bankSlug}
            onChange={(event) => setBankSlug(event.target.value.trim().toLowerCase())}
            placeholder="hdfc"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Network</Label>
          <Select
            value={networkCode || 'any'}
            onValueChange={(value) => setNetworkCode(value === 'any' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {NETWORKS.map((network) => (
                <SelectItem key={network} value={network}>
                  {network}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={category || 'any'}
            onValueChange={(value) => setCategory(value === 'any' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {CATEGORIES.map((row) => (
                <SelectItem key={row} value={row}>
                  {row}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="catalog-fee">Max annual fee (₹)</Label>
          <Input
            id="catalog-fee"
            inputMode="numeric"
            value={maxAnnualFeeInr}
            onChange={(event) => setMaxAnnualFeeInr(event.target.value.replace(/[^\d]/g, ''))}
            placeholder="5000"
          />
        </div>
      </form>

      {isLoading && !data ? (
        <p className="text-sm text-muted-foreground">Loading catalog…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
          <Store className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No cards match these filters.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((card) => (
            <CatalogBrowseCard
              key={card.id}
              card={card}
              selected={selected.includes(card.id)}
              onToggle={() => toggle(card.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CatalogBrowseCard({
  card,
  selected,
  onToggle,
}: {
  card: CatalogCard;
  selected: boolean;
  onToggle: () => void;
}) {
  const verified = Boolean(card.sourceUrl && !/cardinsider|paisabazaar/i.test(card.sourceUrl));

  return (
    <li className="rounded-2xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">{card.bankName ?? card.bank?.name}</p>
          <h2 className="font-display text-base font-semibold tracking-tight">{card.name}</h2>
          <p className="text-xs text-muted-foreground">
            {card.networkName ?? card.network?.name ?? 'Network n/a'}
            {card.annualFeeInr != null
              ? ` · Annual ₹${Number(card.annualFeeInr).toLocaleString('en-IN')}`
              : ''}
          </p>
          <p className="text-[11px] font-medium text-primary">
            {verified ? 'Verified from issuer source' : 'Listed evidence — confirm issuer rates'}
          </p>
        </div>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${card.name} for compare`}
          className="mt-1 size-4"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={`/account/cards/add?q=${encodeURIComponent(card.name)}`}>Add to portfolio</Link>
        </Button>
      </div>
    </li>
  );
}
