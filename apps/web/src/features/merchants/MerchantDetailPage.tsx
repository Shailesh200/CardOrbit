import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@cardwise/ui';
import { Star } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { toast } from '@lib/app-toast';
import { MerchantRecommendationPanel } from '@features/recommendations/components/MerchantRecommendationPanel';
import { MerchantOffersPanel } from './components/MerchantOffersPanel';
import { AiVisual } from '../ai/components/AiVisual';
import { useAiFeatures } from '../ai/use-ai-features';

import {
  addFavoriteMerchant,
  getMerchant,
  removeFavoriteMerchant,
  type MerchantDetail,
} from './merchants-api';
import {
  trackMerchantFavoritedClient,
  trackMerchantUnfavoritedClient,
} from '../../lib/product-analytics';
import { pushRecentMerchant } from './recent-searches';

export function MerchantDetailPage() {
  const { explanations } = useAiFeatures();
  const { merchantSlug = '' } = useParams();
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoritePending, setFavoritePending] = useState(false);

  useEffect(() => {
    if (!merchantSlug) return;
    getMerchant(merchantSlug)
      .then((detail) => {
        setMerchant(detail);
        document.title = `CardOrbit · ${detail.name}`;
        pushRecentMerchant({ id: detail.id, name: detail.name, slug: detail.slug });
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [merchantSlug]);

  async function toggleFavorite() {
    if (!merchant || favoritePending) return;
    setFavoritePending(true);
    try {
      if (merchant.isFavorite) {
        await removeFavoriteMerchant(merchant.id);
        setMerchant({ ...merchant, isFavorite: false });
        trackMerchantUnfavoritedClient({
          merchantId: merchant.id,
          merchantSlug: merchant.slug,
          merchantName: merchant.name,
          source: 'web',
        });
        toast.success('Removed from favorites');
      } else {
        await addFavoriteMerchant({ slug: merchant.slug });
        setMerchant({ ...merchant, isFavorite: true });
        trackMerchantFavoritedClient({
          merchantId: merchant.id,
          merchantSlug: merchant.slug,
          merchantName: merchant.name,
          source: 'web',
        });
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update favorite');
    } finally {
      setFavoritePending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading merchant…</p>;
  }

  if (!merchant) {
    return (
      <div className="space-y-4">
        <PageBackLink to="/account/merchants" label="Back to merchants" />
        <p className="text-sm text-muted-foreground">Merchant not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageBackLink to="/account/merchants" label="Back to merchants" />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {merchant.category?.name ?? 'Merchant'}
            </p>
            <Button
              type="button"
              size="sm"
              variant={merchant.isFavorite ? 'default' : 'outline'}
              disabled={favoritePending}
              onClick={() => void toggleFavorite()}
            >
              <Star className={`size-4 ${merchant.isFavorite ? 'fill-current' : ''}`} aria-hidden />
              {merchant.isFavorite ? 'Favorited' : 'Favorite'}
            </Button>
          </div>
          <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
            {merchant.name}
          </h1>
          {merchant.brandName && merchant.brandName !== merchant.name ? (
            <p className="text-sm text-muted-foreground">Brand: {merchant.brandName}</p>
          ) : null}
          {merchant.parentBrand ? (
            <p className="text-sm text-muted-foreground">Part of {merchant.parentBrand}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Payment methods: {merchant.paymentMethods.join(', ') || 'Card'}
          </p>
          {merchant.website ? (
            <a
              href={merchant.website}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Visit website
            </a>
          ) : null}
        </div>
      </div>

      {merchant.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {merchant.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {merchant.aliases.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Also known as</h2>
          <p className="text-sm text-muted-foreground">{merchant.aliases.join(' · ')}</p>
        </section>
      ) : null}

      <section className="consumer-surface rounded-2xl border border-border/60 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {explanations ? (
            <p className="max-w-xl text-sm text-muted-foreground">
              Best-card pick uses computed reward math from your portfolio, with an optional AI
              summary explaining why it wins.
            </p>
          ) : (
            <span className="text-sm text-muted-foreground">Best card for this merchant</span>
          )}
          {explanations ? (
            <AiVisual variant="explained" illustrationClassName="h-16 w-24 shrink-0" />
          ) : null}
        </div>
        <MerchantRecommendationPanel merchant={merchant} />
        {merchant.offerCount > 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {merchant.offerCount} linked offer{merchant.offerCount === 1 ? '' : 's'} in catalog.
          </p>
        ) : null}
      </section>

      <section className="consumer-surface rounded-2xl border border-border/60 p-5 sm:p-6">
        <MerchantOffersPanel merchantSlug={merchant.slug} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/account/cards">View portfolio</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/account/cards/add">Add a card</Link>
        </Button>
      </div>
    </div>
  );
}
