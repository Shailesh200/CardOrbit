import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { CreditCard, Plus, Star } from 'lucide-react';

import { EmptyState } from '../../components/feedback/EmptyState';
import { PortfolioGridSkeleton } from '../../components/feedback/PageSkeletons';
import { toast } from '../../lib/app-toast';
import { useAiFeatures } from '../ai/use-ai-features';
import { AiVisual } from '../ai/components/AiVisual';

import { consumerLink } from '@lib/consumer-link';

import { listPortfolio, type PortfolioCardSummary } from './portfolio-api';

export function PortfolioPage() {
  const { anyEnabled } = useAiFeatures();
  const [cards, setCards] = useState<PortfolioCardSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'CardOrbit · Your cards';
    listPortfolio()
      .then(setCards)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {anyEnabled ? (
            <AiVisual
              variant="explained"
              className="hidden shrink-0 sm:block"
              illustrationClassName="h-20 w-28"
            />
          ) : null}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Portfolio
            </p>
            <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
              Your cards
            </h1>
            <p className="text-sm text-muted-foreground">
              {anyEnabled
                ? 'Your cards power AI-personalized search, recommendations, and assistant answers.'
                : 'Cards you use for recommendations and reward tracking.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link to="/account/cards/compare">Compare cards</Link>
          </Button>
          <Button asChild className="btn-premium shrink-0">
            <Link to="/account/cards/add">
              <Plus className="size-4" />
              Add card
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <PortfolioGridSkeleton />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No cards yet"
          description={
            anyEnabled
              ? 'Add cards from our AI-organized Indian credit card catalog to unlock personalized, AI-explained recommendations.'
              : 'Add cards from our Indian credit card catalog to unlock personalized recommendations.'
          }
          visual={
            anyEnabled ? (
              <AiVisual variant="explained" illustrationClassName="mx-auto h-28 w-36" />
            ) : undefined
          }
          action={
            <Button asChild className="btn-premium">
              <Link to="/account/cards/add">Browse catalog</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cards.map((item) => (
            <li key={item.id}>
              <Link
                to={`/account/cards/${item.id}`}
                className="consumer-portfolio-card group block rounded-2xl border border-border/60 bg-background/60 p-5 transition hover:border-primary/25 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {item.card.bank.name} · {item.card.network.code}
                    </p>
                    <h2 className="font-display truncate text-lg font-semibold tracking-tight">
                      {item.nickname ?? item.card.name}
                    </h2>
                    {item.nickname ? (
                      <p className="truncate text-sm text-muted-foreground">{item.card.name}</p>
                    ) : null}
                  </div>
                  {item.isFavorite ? (
                    <Star
                      className="size-4 shrink-0 fill-primary text-primary"
                      aria-label="Favorite"
                    />
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2.5 py-1 font-medium capitalize">
                    {item.status.toLowerCase()}
                  </span>
                  {item.benefitCount > 0 ? (
                    <span className="text-muted-foreground">
                      {item.benefitCount} benefit{item.benefitCount === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>
                {item.topBenefits.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {item.topBenefits.map((benefit) => (
                      <li key={benefit} className="truncate">
                        {benefit}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-sm text-muted-foreground sm:text-left">
        Need to update profile details?{' '}
        <Link className={consumerLink} to="/account/profile">
          Go to profile
        </Link>
      </p>
    </div>
  );
}
