import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { CreditCard, Plus, Star } from 'lucide-react';

import { MiniCreditCard } from '@brand/MiniCreditCard';

import type { PortfolioCardSummary } from '../../portfolio/portfolio-api';

type Props = {
  cards: PortfolioCardSummary[];
  loading: boolean;
};

export function PortfolioSummarySection({ cards, loading }: Props) {
  const preview = cards.slice(0, 4);

  return (
    <section className="space-y-4" aria-labelledby="dashboard-portfolio-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Portfolio
          </p>
          <h2
            id="dashboard-portfolio-heading"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Your cards
          </h2>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/account/cards">{cards.length > 0 ? 'View all' : 'Manage cards'}</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading portfolio…</p>
      ) : preview.length === 0 ? (
        <div className="consumer-empty-state flex flex-col items-center gap-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-6 py-10 text-center">
          <CreditCard className="size-9 text-primary/70" aria-hidden />
          <p className="max-w-sm text-sm text-muted-foreground">
            Add cards from the catalog to unlock personalized recommendations.
          </p>
          <Button asChild size="sm" className="btn-premium">
            <Link to="/account/cards/add">
              <Plus className="size-4" />
              Add a card
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {preview.map((item) => (
            <li key={item.id}>
              <Link
                to={`/account/cards/${item.id}`}
                className="dashboard-portfolio-card group flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/25 hover:shadow-md"
              >
                <MiniCreditCard
                  bankSlug={item.card.bank.slug}
                  cardSlug={item.card.slug}
                  cardName={item.card.name}
                  className="w-[4.5rem] shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display truncate text-base font-semibold tracking-tight">
                      {item.nickname ?? item.card.name}
                    </p>
                    {item.isFavorite ? (
                      <Star
                        className="size-3.5 shrink-0 fill-primary text-primary"
                        aria-label="Favorite"
                      />
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.card.bank.name} · {item.card.network.code}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
