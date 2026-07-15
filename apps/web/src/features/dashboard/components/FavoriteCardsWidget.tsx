import { Link } from 'react-router';
import { Star } from 'lucide-react';

import { MiniCreditCard } from '@brand/MiniCreditCard';

import type { PortfolioCardSummary } from '../../portfolio/portfolio-api';

type Props = {
  cards: PortfolioCardSummary[];
};

export function FavoriteCardsWidget({ cards }: Props) {
  if (cards.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="dashboard-favorites-heading">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Favorites</p>
        <h2
          id="dashboard-favorites-heading"
          className="font-display text-xl font-semibold tracking-tight"
        >
          Recently used cards
        </h2>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {cards.map((item) => (
          <li key={item.id} className="min-w-[9rem] shrink-0">
            <Link
              to={`/account/cards/${item.id}`}
              className="dashboard-favorite-card flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-3 transition hover:border-primary/25"
            >
              <MiniCreditCard
                bankSlug={item.card.bank.slug}
                cardSlug={item.card.slug}
                cardName={item.card.name}
                className="w-[4.5rem]"
              />
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-medium">{item.nickname ?? item.card.name}</p>
                <p className="inline-flex items-center gap-1 text-xs text-primary">
                  <Star className="size-3 fill-primary" aria-hidden />
                  Favorite
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
