import { Link } from 'react-router';
import { Star } from 'lucide-react';

import { MerchantMark } from '@brand/MerchantMark';

import type { MerchantListItem } from '../../merchants/merchants-api';
import type { RecentMerchant } from '../../merchants/recent-searches';

type Props = {
  favorites: MerchantListItem[];
  recent: RecentMerchant[];
  popular: MerchantListItem[];
  loading: boolean;
};

export function RecentMerchantsSection({ favorites, recent, popular, loading }: Props) {
  const merchants =
    favorites.length > 0
      ? favorites.slice(0, 8).map((item) => ({
          slug: item.slug,
          name: item.name,
          category: item.category?.name ?? null,
          favorite: true,
        }))
      : recent.length > 0
        ? recent.map((item) => ({
            slug: item.slug,
            name: item.name,
            category: null as string | null,
            favorite: false,
          }))
        : popular.slice(0, 6).map((item) => ({
            slug: item.slug,
            name: item.name,
            category: item.category?.name ?? null,
            favorite: false,
          }));

  const heading =
    favorites.length > 0
      ? 'Favorite merchants'
      : recent.length > 0
        ? 'Recent merchants'
        : 'Popular merchants';

  return (
    <section className="space-y-4" aria-labelledby="dashboard-merchants-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Merchants
          </p>
          <h2
            id="dashboard-merchants-heading"
            className="font-display text-xl font-semibold tracking-tight"
          >
            {heading}
          </h2>
        </div>
        <Link className="consumer-link consumer-link--sm" to="/account/merchants">
          Search merchants
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading merchants…</p>
      ) : merchants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Browse merchants to see where your cards earn the most.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {merchants.map((merchant) => (
            <li key={merchant.slug}>
              <Link
                to={`/account/merchants/${merchant.slug}`}
                className="dashboard-merchant-chip inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-2 text-sm transition hover:border-primary/25 hover:bg-primary/5"
              >
                <MerchantMark name={merchant.name} slug={merchant.slug} />
                {merchant.favorite ? (
                  <Star className="size-3 fill-primary text-primary" aria-hidden />
                ) : null}
                {merchant.category ? (
                  <span className="text-xs text-muted-foreground">{merchant.category}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
