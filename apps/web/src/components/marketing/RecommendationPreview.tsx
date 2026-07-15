import { MiniCreditCard } from '@brand/MiniCreditCard';
import { MerchantMark } from '@brand/MerchantMark';
import { AiBadge } from '@features/ai/components/AiBadge';
import {
  formatInr,
  formatRewardHighlight,
  LIVE_RECOMMENDATION_SCENARIO,
} from '@features/recommendations/recommendations-api';
import { useLiveRecommendation } from '../../hooks/useLiveRecommendation';

type Props = {
  compact?: boolean;
};

function RecommendationPreviewSkeleton({ compact }: Props) {
  return (
    <div
      className={`reco-preview reco-preview--loading ${compact ? 'reco-preview--compact' : ''}`}
      aria-busy="true"
      aria-label="Loading live recommendation"
    >
      <div className="reco-preview__header">
        <span className="reco-preview__live">
          <span className="reco-preview__dot" aria-hidden />
          Live recommendation
        </span>
      </div>
      <div className="reco-preview__body">
        <div className="reco-preview__skeleton-card" />
        <div className="reco-preview__copy min-w-0 flex-1 space-y-2">
          <div className="reco-preview__skeleton-line reco-preview__skeleton-line--sm" />
          <div className="reco-preview__skeleton-line" />
          <div className="reco-preview__skeleton-line reco-preview__skeleton-line--md" />
        </div>
      </div>
    </div>
  );
}

function RecommendationPreviewContent({
  compact,
  merchantName,
  merchantSlug,
  merchantLogoUrl,
  amount,
  cardName,
  cardSlug,
  bankSlug,
  rewardLine,
  sourceLabel,
  explanationSource,
}: Props & {
  merchantName: string;
  merchantSlug: string;
  merchantLogoUrl?: string | null;
  amount: number;
  cardName: string;
  cardSlug?: string;
  bankSlug: string;
  rewardLine: string;
  sourceLabel: string;
  explanationSource?: 'ai' | 'template';
}) {
  const ariaLabel = `Recommendation preview: use ${cardName} at ${merchantName} — ${rewardLine} on a ${amount} rupee order`;

  return (
    <div
      className={`reco-preview ${compact ? 'reco-preview--compact' : ''}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="reco-preview__header flex flex-wrap items-center gap-2">
        <span className="reco-preview__live">
          <span className="reco-preview__dot" aria-hidden />
          Live recommendation
        </span>
        {explanationSource === 'ai' ? (
          <>
            <img src="/assets/ai/ai-explained-mark.svg" alt="" className="size-5" aria-hidden />
            <AiBadge variant="explained" />
          </>
        ) : null}
      </div>

      <div className="reco-preview__body">
        <MiniCreditCard
          bankSlug={bankSlug}
          cardSlug={cardSlug}
          cardName={cardName}
          className="reco-preview__card"
        />
        <div className="reco-preview__copy min-w-0 flex-1">
          <MerchantMark name={merchantName} slug={merchantSlug} logoUrl={merchantLogoUrl} />
          <p className="reco-preview__headline font-display text-base font-semibold leading-snug tracking-tight sm:text-lg">
            Use {cardName} here
          </p>
          <p className="reco-preview__reward text-sm">
            <span className="reco-preview__reward-accent font-semibold">{rewardLine}</span>
          </p>
        </div>
      </div>

      <div className="reco-preview__footer">
        <span className="reco-preview__pill">{formatInr(amount)} order</span>
        <span className="reco-preview__arrow" aria-hidden>
          →
        </span>
        <span className="reco-preview__pill reco-preview__pill--pick">{sourceLabel}</span>
      </div>
    </div>
  );
}

export function RecommendationPreview({ compact = false }: Props) {
  const live = useLiveRecommendation();

  if (live.status === 'loading') {
    return <RecommendationPreviewSkeleton compact={compact} />;
  }

  if (live.status === 'ready') {
    const { recommendedCard, merchant } = live.data;
    if (recommendedCard && merchant) {
      return (
        <RecommendationPreviewContent
          compact={compact}
          merchantName={merchant.name}
          merchantSlug={merchant.slug}
          merchantLogoUrl={merchant.logoUrl}
          amount={live.data.amount}
          cardName={recommendedCard.cardName}
          cardSlug={recommendedCard.cardSlug}
          bankSlug={recommendedCard.bankSlug}
          rewardLine={formatRewardHighlight(live.data)}
          sourceLabel={live.data.source === 'portfolio' ? 'Your best card' : 'Best card picked'}
          explanationSource={live.data.explanationSource}
        />
      );
    }
  }

  return (
    <RecommendationPreviewContent
      compact={compact}
      merchantName="Swiggy"
      merchantSlug={LIVE_RECOMMENDATION_SCENARIO.merchantSlug}
      amount={LIVE_RECOMMENDATION_SCENARIO.amount}
      cardName="HDFC Bank Millennia"
      cardSlug="hdfc-millennia-2"
      bankSlug="hdfc"
      rewardLine="3× reward points on dining"
      sourceLabel="Demo · computed rewards"
      explanationSource="ai"
    />
  );
}
