import { Button } from '@cardwise/ui';
import { ExternalLink, Sparkles } from 'lucide-react';

import { MiniCreditCard } from '@brand/MiniCreditCard';
import { MerchantMark } from '@brand/MerchantMark';
import {
  formatInr,
  formatRewardHighlight,
  type PopupRecommendationResponse,
  type RecommendationCard,
} from '../lib/messages';

type Props = {
  state: Extract<PopupRecommendationResponse, { status: 'ready' }>;
  webAppUrl: string;
};

function AlternativeCardRow({ card, rank }: { card: RecommendationCard; rank: number }) {
  return (
    <div className="reco-alt-row flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">#{rank}</span>
      <MiniCreditCard
        bankSlug={card.bankSlug}
        cardSlug={card.cardSlug}
        cardName={card.cardName}
        className="w-[3.25rem] shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{card.cardName}</p>
        <p className="truncate text-xs text-muted-foreground">{card.bankName}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-primary">{formatInr(card.expectedReward)}</p>
        <p className="text-xs text-muted-foreground">{card.effectiveRatePercent.toFixed(1)}% back</p>
      </div>
    </div>
  );
}

function BestCardHero({
  card,
  amount,
  merchantName,
  merchantSlug,
  merchantLogoUrl,
  explanation,
  badge,
}: {
  card: RecommendationCard;
  amount: number;
  merchantName: string;
  merchantSlug: string;
  merchantLogoUrl?: string | null;
  explanation?: string;
  badge: string;
}) {
  return (
    <article className="reco-best rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {badge}
        </span>
        <MerchantMark name={merchantName} slug={merchantSlug} logoUrl={merchantLogoUrl} />
      </div>

      <div className="flex items-center gap-3">
        <MiniCreditCard
          bankSlug={card.bankSlug}
          cardSlug={card.cardSlug}
          cardName={card.cardName}
          className="w-[4.75rem] shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-display text-base font-semibold tracking-tight">{card.cardName}</p>
          <p className="text-xs text-muted-foreground">{card.bankName}</p>
          <p className="text-sm font-semibold text-primary">
            {formatInr(card.expectedReward)} on {formatInr(amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {card.effectiveRatePercent.toFixed(1)}% effective rate
          </p>
        </div>
      </div>

      {explanation ? (
        <p className="mt-3 border-t border-primary/10 pt-3 text-xs leading-relaxed text-muted-foreground">
          {explanation}
        </p>
      ) : null}
    </article>
  );
}

export function RecommendationPanel({ state, webAppUrl }: Props) {
  const { recommendation, tab } = state;
  const merchantName = recommendation.merchant?.name ?? 'This merchant';
  const merchantSlug = recommendation.merchant?.slug ?? tab.merchantSlug ?? 'merchant';
  const merchantLogoUrl = recommendation.merchant?.logoUrl;
  const portfolioBest = recommendation.recommendedCard;
  const catalog = recommendation.catalogRecommendation;

  return (
    <div className="consumer-surface consumer-surface-accent consumer-surface--glass space-y-4 p-4">
      <div className="extension-live-badge">
        <span className="extension-live-badge__dot" aria-hidden />
        Live recommendation
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <MerchantMark name={merchantName} slug={merchantSlug} logoUrl={merchantLogoUrl} />
        <span className="text-muted-foreground">·</span>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
          {formatInr(recommendation.amount)} spend
        </span>
      </div>

      <section className="space-y-3" aria-label="Your portfolio">
        <div className="space-y-1">
          <h2 className="font-display text-sm font-semibold tracking-tight">Your portfolio</h2>
          <p className="text-xs text-muted-foreground">
            {portfolioBest
              ? 'Best card from cards you own'
              : 'None of your cards earn rewards here'}
          </p>
        </div>

        {portfolioBest ? (
          <div className="space-y-2">
            <BestCardHero
              card={portfolioBest}
              amount={recommendation.amount}
              merchantName={merchantName}
              merchantSlug={merchantSlug}
              merchantLogoUrl={merchantLogoUrl}
              explanation={formatRewardHighlight(recommendation)}
              badge="Best in portfolio"
            />
            {recommendation.alternatives.length > 0 ? (
              <ul className="space-y-2">
                {recommendation.alternatives.slice(0, 3).map((card, index) => (
                  <li key={card.userCardId}>
                    <AlternativeCardRow card={card} rank={index + 2} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="space-y-2">
                <p>No portfolio card matches rewards for {merchantName}.</p>
                <Button asChild size="sm" className="btn-premium">
                  <a href={`${webAppUrl}/account/cards/add`} target="_blank" rel="noreferrer">
                    Add a card
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {catalog && catalog.cardsEvaluated > 0 ? (
        <section
          className="space-y-3 border-t border-border/60 pt-4"
          aria-label="Catalog cards to consider"
        >
          <div className="space-y-1">
            <h2 className="font-display text-sm font-semibold tracking-tight">Cards to consider</h2>
            <p className="text-xs text-muted-foreground">
              Top catalog cards not in your portfolio yet
            </p>
          </div>

          {catalog.recommendedCard ? (
            <div className="space-y-2">
              <BestCardHero
                card={catalog.recommendedCard}
                amount={recommendation.amount}
                merchantName={merchantName}
                merchantSlug={merchantSlug}
                merchantLogoUrl={merchantLogoUrl}
                explanation={formatRewardHighlight(catalog)}
                badge="Catalog pick"
              />
              {catalog.alternatives.length > 0 ? (
                <ul className="space-y-2">
                  {catalog.alternatives.slice(0, 3).map((card, index) => (
                    <li key={card.userCardId}>
                      <AlternativeCardRow card={card} rank={index + 2} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No catalog cards with eligible rewards for this merchant yet.
            </p>
          )}
        </section>
      ) : null}

      {merchantSlug ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-sm">
          <a
            className="consumer-link consumer-link--sm extension-link-row ml-auto"
            href={`${webAppUrl}/account/merchants/${merchantSlug}`}
            target="_blank"
            rel="noreferrer"
          >
            Full breakdown
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      ) : null}
    </div>
  );
}
