import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button, Input, Label } from '@cardwise/ui';
import { AlertTriangle, CreditCard, Sparkles } from 'lucide-react';

import { MiniCreditCard } from '@brand/MiniCreditCard';
import { MerchantMark } from '@brand/MerchantMark';
import { AiBadge } from '@features/ai/components/AiBadge';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { RecommendationPanelSkeleton } from '../../../components/feedback/PageSkeletons';

import { useRecommendation } from '../../../hooks/useRecommendation';
import type { MerchantDetail } from '../../merchants/merchants-api';
import {
  addCardHref,
  formatInr,
  formatRewardHighlight,
  type RecommendationCard,
} from '../recommendations-api';
import {
  trackRecommendationClickedClient,
  trackRecommendationViewedClient,
} from '../recommendation-analytics';
import { trackAlternativeCardSelectedClient } from '../../../lib/product-analytics';
import { RecommendationFeedbackBar } from './RecommendationFeedbackBar';

const DEFAULT_AMOUNT = 1000;

type Props = {
  merchant: MerchantDetail;
};

function AlternativeCardRow({
  card,
  rank,
  onSelect,
}: {
  card: RecommendationCard;
  rank: number;
  onSelect?: (card: RecommendationCard, rank: number) => void;
}) {
  const content = (
    <>
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
        <p className="text-xs text-muted-foreground">
          {card.effectiveRatePercent.toFixed(1)}% back
        </p>
      </div>
    </>
  );

  if (!onSelect) {
    return (
      <div className="reco-alt-row flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(card, rank)}
      className="reco-alt-row flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 text-left transition hover:border-primary/25 hover:bg-primary/5"
    >
      {content}
    </button>
  );
}

export function MerchantRecommendationPanel({ merchant }: Props) {
  const amountInputId = useId();
  const viewedRecommendationId = useRef<string | null>(null);
  const [amountInput, setAmountInput] = useState(String(DEFAULT_AMOUNT));
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const recommendation = useRecommendation({
    merchantSlug: merchant.slug,
    categorySlug: merchant.category?.slug ?? null,
    amount,
  });

  const ready = recommendation.status === 'ready' ? recommendation.data : null;
  const best = ready?.recommendedCard ?? null;
  const catalog = ready?.catalogRecommendation ?? null;
  const catalogBest = catalog?.recommendedCard ?? null;
  const recommendationId = ready?.recommendationId ?? null;

  useEffect(() => {
    if (!ready || !recommendationId) return;
    if (viewedRecommendationId.current === recommendationId) return;

    const primary = best ?? catalogBest;
    if (!primary) return;

    viewedRecommendationId.current = recommendationId;
    trackRecommendationViewedClient({
      merchantId: merchant.id,
      merchantName: merchant.name,
      category: merchant.category?.name,
      amount: ready.amount,
      recommendedCardId: primary.cardId,
      expectedReward: primary.expectedReward,
      availableCardIds: [
        ...(best ? [best.cardId, ...ready.alternatives.map((c) => c.cardId)] : []),
        ...(catalogBest
          ? [catalogBest.cardId, ...(catalog?.alternatives.map((c) => c.cardId) ?? [])]
          : []),
      ],
    });
  }, [
    recommendationId,
    best?.cardId,
    catalogBest?.cardId,
    merchant.id,
    merchant.name,
    merchant.category?.name,
    ready,
    catalog?.alternatives,
  ]);

  function onAmountSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number.parseFloat(amountInput.replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      setAmount(parsed);
    }
  }

  function onAlternativeClick(card: RecommendationCard, rank: number) {
    if (best) {
      trackAlternativeCardSelectedClient({
        merchantId: merchant.id,
        merchantName: merchant.name,
        category: merchant.category?.name,
        amount,
        recommendedCardId: card.cardId,
        expectedReward: card.expectedReward,
        previousRecommendedCardId: best.cardId,
        rank,
      });
    }
    trackRecommendationClickedClient({
      merchantId: merchant.id,
      merchantName: merchant.name,
      category: merchant.category?.name,
      amount,
      recommendedCardId: card.cardId,
      expectedReward: card.expectedReward,
      clickedCardId: card.cardId,
      action: 'accepted',
    });
  }

  function onCatalogAddClick(card: RecommendationCard) {
    trackRecommendationClickedClient({
      merchantId: merchant.id,
      merchantName: merchant.name,
      category: merchant.category?.name,
      amount,
      recommendedCardId: card.cardId,
      expectedReward: card.expectedReward,
      clickedCardId: card.cardId,
      action: 'accepted',
    });
  }

  return (
    <section className="space-y-5" aria-labelledby="merchant-reco-heading">
      <div className="space-y-1">
        <h2
          id="merchant-reco-heading"
          className="font-display text-lg font-semibold tracking-tight"
        >
          Which card should you use?
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your spend amount to rank cards in your portfolio for {merchant.name}.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onAmountSubmit}>
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={amountInputId}>Spend amount (₹)</Label>
          <Input
            id={amountInputId}
            inputMode="decimal"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="e.g. 2500"
            aria-describedby="merchant-reco-amount-hint"
          />
          <p id="merchant-reco-amount-hint" className="text-xs text-muted-foreground">
            We compare reward rules across your portfolio and top catalog cards.
          </p>
        </div>
        <Button type="submit" className="btn-premium shrink-0 sm:mb-6">
          Get recommendation
        </Button>
      </form>

      {recommendation.status === 'loading' ? (
        <RecommendationPanelSkeleton />
      ) : recommendation.status === 'idle' ? (
        <p className="text-sm text-muted-foreground">Enter an amount and tap Get recommendation.</p>
      ) : null}

      {recommendation.status === 'error' ? (
        <EmptyState
          icon={AlertTriangle}
          title="Recommendation unavailable"
          description={recommendation.message}
          action={
            <Button asChild size="sm" className="btn-premium">
              <Link to="/account/cards/explore">Browse catalog</Link>
            </Button>
          }
          className="py-8"
        />
      ) : null}

      {ready ? (
        <div className="space-y-6">
          <section className="space-y-3" aria-label="Your portfolio">
            <div className="space-y-1">
              <h3 className="font-display text-sm font-semibold tracking-tight">Your portfolio</h3>
              <p className="text-xs text-muted-foreground">
                {best
                  ? 'Best card from cards you own'
                  : ready.cardsEvaluated === 0
                    ? 'No cards in your portfolio yet — catalog picks are below'
                    : 'None of your cards earn rewards here'}
              </p>
            </div>

            {best ? (
              <div className="space-y-5">
                <article className="reco-best rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      Best in portfolio
                    </span>
                    <MerchantMark name={merchant.name} slug={merchant.slug} />
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <MiniCreditCard
                      bankSlug={best.bankSlug}
                      cardSlug={best.cardSlug}
                      cardName={best.cardName}
                      className="mx-auto w-[7.5rem] shrink-0 sm:mx-0"
                    />
                    <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                      <p className="font-display text-xl font-semibold tracking-tight">
                        {best.cardName}
                      </p>
                      <p className="text-sm text-muted-foreground">{best.bankName}</p>
                      <p className="text-lg font-semibold text-primary">
                        {formatInr(best.expectedReward)} estimated reward
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {best.effectiveRatePercent.toFixed(1)}% effective rate on{' '}
                        {formatInr(amount)}
                      </p>
                      {ready.rankingVersion === 'v2' || ready.rankingVersion === 'v3' ? (
                        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {Math.round(best.confidenceScore * 100)}% confidence
                          </span>
                          {ready.rankingVersion === 'v3' ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              Strategic V3
                            </span>
                          ) : null}
                          {best.campaignApplied ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              Campaign active
                            </span>
                          ) : null}
                          {best.milestoneCrossed ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              Milestone crossed
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-primary/10 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">Why this card</h4>
                      {ready.explanationSource === 'ai' ? <AiBadge variant="explained" /> : null}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {ready.explanation}
                    </p>
                    {ready.bulletReasons && ready.bulletReasons.length > 0 ? (
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {ready.bulletReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                    {ready.calculationBreakdown ? (
                      <details className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
                        <summary className="cursor-pointer font-medium text-foreground">
                          See calculation
                        </summary>
                        <dl className="mt-2 space-y-1">
                          <div className="flex justify-between gap-4">
                            <dt>Spend amount</dt>
                            <dd className="font-medium text-foreground">
                              {formatInr(ready.calculationBreakdown.amountInr)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt>Expected reward</dt>
                            <dd className="font-medium text-foreground">
                              {formatInr(ready.calculationBreakdown.expectedRewardInr)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt>Effective rate</dt>
                            <dd className="font-medium text-foreground">
                              {ready.calculationBreakdown.effectiveRatePercent.toFixed(1)}%
                            </dd>
                          </div>
                          {ready.calculationBreakdown.ruleName ? (
                            <div className="flex justify-between gap-4">
                              <dt>Reward rule</dt>
                              <dd className="text-right font-medium text-foreground">
                                {ready.calculationBreakdown.ruleName}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </details>
                    ) : null}
                    {best.scoreBreakdown &&
                    (ready.rankingVersion === 'v2' || ready.rankingVersion === 'v3') &&
                    best.scoreBreakdown.compositeInr > best.scoreBreakdown.rewardInr ? (
                      <ul className="list-inside list-disc text-xs text-muted-foreground">
                        {best.scoreBreakdown.merchantBonusInr > 0 ? (
                          <li>
                            +{formatInr(best.scoreBreakdown.merchantBonusInr)} merchant context
                          </li>
                        ) : null}
                        {best.scoreBreakdown.preferenceBonusInr > 0 ? (
                          <li>
                            +{formatInr(best.scoreBreakdown.preferenceBonusInr)} preference match
                          </li>
                        ) : null}
                        {best.scoreBreakdown.promotionBonusInr > 0 ? (
                          <li>
                            +{formatInr(best.scoreBreakdown.promotionBonusInr)} active promotion
                          </li>
                        ) : null}
                        {(best.scoreBreakdown.strategicMilestoneBonusInr ?? 0) > 0 ? (
                          <li>
                            +{formatInr(best.scoreBreakdown.strategicMilestoneBonusInr ?? 0)}{' '}
                            milestone strategy
                          </li>
                        ) : null}
                        {(best.scoreBreakdown.strategicExpiryBonusInr ?? 0) > 0 ? (
                          <li>
                            +{formatInr(best.scoreBreakdown.strategicExpiryBonusInr ?? 0)} expiring
                            rewards
                          </li>
                        ) : null}
                        {(best.scoreBreakdown.strategicTravelBonusInr ?? 0) > 0 ? (
                          <li>
                            +{formatInr(best.scoreBreakdown.strategicTravelBonusInr ?? 0)} travel
                            affinity
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                    {best.strategicRationale ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {best.strategicRationale}
                      </p>
                    ) : null}
                    {best.benefitsApplied.length > 0 &&
                    (!ready.bulletReasons || ready.bulletReasons.length === 0) ? (
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {best.benefitsApplied.map((benefit) => (
                          <li key={benefit}>{benefit}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </article>

                {ready.alternatives.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Other cards ranked</h4>
                    <ul className="space-y-2">
                      {ready.alternatives.map((card, index) => (
                        <li key={card.userCardId}>
                          <AlternativeCardRow
                            card={card}
                            rank={index + 2}
                            onSelect={onAlternativeClick}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  Compared {ready.cardsEvaluated} card{ready.cardsEvaluated === 1 ? '' : 's'} in
                  your portfolio.
                </p>
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title={
                  ready.cardsEvaluated === 0 ? 'No portfolio cards yet' : 'No portfolio rewards'
                }
                description={
                  ready.cardsEvaluated === 0
                    ? `Add a card you own, or pick a catalog recommendation below for ${merchant.name}.`
                    : `None of your cards earn rewards for this spend at ${merchant.name}. Try a different amount or add a better-matching card.`
                }
                action={
                  <Button asChild size="sm" className="btn-premium">
                    <Link to={addCardHref(catalogBest)}>
                      {ready.cardsEvaluated === 0 ? 'Add from catalog' : 'Add a card'}
                    </Link>
                  </Button>
                }
                secondaryAction={
                  ready.cardsEvaluated === 0 ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/account/cards/explore">Browse explore</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/account/cards">View portfolio</Link>
                    </Button>
                  )
                }
                className="py-8"
              />
            )}
          </section>

          {catalog && catalog.cardsEvaluated > 0 ? (
            <section
              className="space-y-3 border-t border-border/60 pt-5"
              aria-label="Catalog recommendations"
            >
              <div className="space-y-1">
                <h3 className="font-display text-sm font-semibold tracking-tight">
                  From the catalog
                </h3>
                <p className="text-xs text-muted-foreground">
                  {ready.cardsEvaluated === 0
                    ? 'Top catalog cards for this spend — add one to start tracking rewards'
                    : 'Top catalog cards not in your portfolio yet'}
                </p>
              </div>

              {catalogBest ? (
                <div className="space-y-3">
                  <article className="reco-best rounded-2xl border border-primary/20 bg-primary/5 p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        Catalog pick
                      </span>
                      <MerchantMark name={merchant.name} slug={merchant.slug} />
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <MiniCreditCard
                        bankSlug={catalogBest.bankSlug}
                        cardSlug={catalogBest.cardSlug}
                        cardName={catalogBest.cardName}
                        className="mx-auto w-[7.5rem] shrink-0 sm:mx-0"
                      />
                      <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                        <p className="font-display text-xl font-semibold tracking-tight">
                          {catalogBest.cardName}
                        </p>
                        <p className="text-sm text-muted-foreground">{catalogBest.bankName}</p>
                        <p className="text-lg font-semibold text-primary">
                          {formatInr(catalogBest.expectedReward)} estimated reward
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {catalogBest.effectiveRatePercent.toFixed(1)}% effective rate on{' '}
                          {formatInr(amount)}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {formatRewardHighlight(catalog)}
                        </p>
                        <Button asChild size="sm" className="btn-premium">
                          <Link
                            to={addCardHref(catalogBest)}
                            onClick={() => onCatalogAddClick(catalogBest)}
                          >
                            <Sparkles className="size-4" aria-hidden />
                            Add card
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>

                  {catalog.alternatives.length > 0 ? (
                    <ul className="space-y-2">
                      {catalog.alternatives.slice(0, 3).map((card, index) => (
                        <li key={card.userCardId || card.cardId}>
                          <AlternativeCardRow card={card} rank={index + 2} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No catalog cards with eligible rewards for this merchant yet.
                </p>
              )}
            </section>
          ) : null}

          {recommendationId && best ? (
            <RecommendationFeedbackBar
              recommendationId={recommendationId}
              merchantName={merchant.name}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
