import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';

import { MiniCreditCard } from '@brand/MiniCreditCard';
import { MerchantMark } from '@brand/MerchantMark';
import { AiBadge } from '@features/ai/components/AiBadge';
import { AiVisual } from '@features/ai/components/AiVisual';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { RecommendationPanelSkeleton } from '../../../components/feedback/PageSkeletons';
import {
  fetchRecommendationShowcase,
  formatInr,
  formatRewardHighlight,
  type LiveRecommendation,
} from '@features/recommendations/recommendations-api';
import { useRecommendation } from '../../../hooks/useRecommendation';
import type { DashboardRecommendationScenario } from '../dashboard-api';

type Props = {
  scenario: DashboardRecommendationScenario;
};

export function DashboardRecommendationWidget({ scenario }: Props) {
  const recommendation = useRecommendation({
    merchantSlug: scenario.merchantSlug,
    categorySlug: scenario.categorySlug,
    amount: scenario.amount,
    enabled: true,
    immediate: true,
  });
  const [showcase, setShowcase] = useState<LiveRecommendation | null>(null);
  const [showcaseStatus, setShowcaseStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );

  const needsFallback =
    recommendation.status === 'error' ||
    (recommendation.status === 'ready' &&
      (!recommendation.data.recommendedCard || !recommendation.data.merchant));

  useEffect(() => {
    if (!needsFallback) {
      setShowcase(null);
      setShowcaseStatus('idle');
      return;
    }

    let cancelled = false;
    setShowcaseStatus('loading');
    const timer = window.setTimeout(() => {
      fetchRecommendationShowcase()
        .then((data) => {
          if (!cancelled) {
            setShowcase(data);
            setShowcaseStatus('ready');
          }
        })
        .catch(() => {
          if (!cancelled) setShowcaseStatus('error');
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [needsFallback]);

  if (recommendation.status === 'loading' || recommendation.status === 'idle') {
    return (
      <section className="dashboard-reco rounded-2xl border border-border/60 p-5">
        <RecommendationPanelSkeleton />
      </section>
    );
  }

  const data =
    recommendation.status === 'ready' &&
    recommendation.data.recommendedCard &&
    recommendation.data.merchant
      ? recommendation.data
      : showcaseStatus === 'ready' && showcase
        ? showcase
        : null;

  if (!data) {
    if (showcaseStatus === 'loading') {
      return (
        <section className="dashboard-reco rounded-2xl border border-border/60 p-5">
          <RecommendationPanelSkeleton />
        </section>
      );
    }

    return (
      <EmptyState
        visual={<AiVisual variant="explained" illustrationClassName="h-20 w-28" />}
        title={
          recommendation.status === 'error'
            ? 'Recommendations unavailable'
            : 'Add a card to get recommendations'
        }
        description={
          recommendation.status === 'error'
            ? recommendation.message
            : 'We compare rewards across your portfolio for every merchant and amount.'
        }
        action={
          <Button asChild size="sm" className="btn-premium">
            <Link to="/account/cards/add">Browse card catalog</Link>
          </Button>
        }
        className="py-8"
      />
    );
  }

  const card = data.recommendedCard!;
  const merchant = data.merchant!;
  const rewardLine = formatRewardHighlight(data);
  const amount = data.source === 'showcase' ? data.amount : scenario.amount;

  return (
    <section className="dashboard-reco space-y-4" aria-label="Best card recommendation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Quick recommendation
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {data.explanationSource === 'ai' ? <AiBadge variant="explained" /> : null}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
            Live
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <MiniCreditCard
          bankSlug={card.bankSlug}
          cardSlug={card.cardSlug}
          cardName={card.cardName}
          className="mx-auto w-[7.5rem] shrink-0 sm:mx-0"
        />
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <MerchantMark name={merchant.name} slug={merchant.slug} logoUrl={merchant.logoUrl} />
          <p className="font-display text-lg font-semibold tracking-tight">Use {card.cardName}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{rewardLine}</span>
          </p>
          {data.explanation ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{data.explanation}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 text-sm">
        <span className="rounded-lg bg-muted px-2.5 py-1 font-medium">
          {formatInr(amount)} at {merchant.name}
        </span>
        <Link
          className="consumer-link consumer-link--sm ml-auto"
          to={`/account/merchants/${merchant.slug}`}
        >
          See full breakdown
        </Link>
      </div>
    </section>
  );
}
