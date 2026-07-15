import type {
  BookingChannelRecommendInput,
  BookingChannelRecommendResult,
  BookingChannelRecommendation,
  BookingExplanationFactor,
  BookingProduct,
  IssuerTravelPortal,
} from '@cardwise/validation';

import { listActivePortals } from './catalog/issuer-travel-portals';

export type ChannelPortfolioCard = {
  userCardId: string;
  cardName: string;
  bankName: string;
  bankSlug?: string | null;
};

export type ChannelRankerContext = {
  cards: ChannelPortfolioCard[];
  preferredUserCardId?: string | null;
};

const DEFAULT_GROSS_INR = 25_000;
const DISCLOSURE =
  'Bank portal bookings complete on the issuer website. CardOrbit recommends channels for accelerated rewards and does not issue tickets for portal handoffs.';

export function buildDeepLinkUrl(
  portal: IssuerTravelPortal,
  input: BookingChannelRecommendInput,
): { url: string; searchHint: string | null } {
  const product = input.product;
  const origin = input.origin ?? '';
  const destination = input.destination ?? '';
  const departureDate = input.departureDate ?? input.checkInDate ?? '';
  const returnDate = input.returnDate ?? input.checkOutDate ?? '';

  const hintParts = [
    origin && destination ? `${origin} → ${destination}` : destination || null,
    departureDate || null,
    returnDate ? `return ${returnDate}` : null,
    product,
  ].filter(Boolean);
  const searchHint = hintParts.length > 0 ? `Search for: ${hintParts.join(' · ')}` : null;

  if (!portal.deepLinkTemplate) {
    return { url: portal.baseUrl, searchHint };
  }

  let url = portal.deepLinkTemplate
    .replaceAll('{product}', encodeURIComponent(product.toLowerCase()))
    .replaceAll('{origin}', encodeURIComponent(origin))
    .replaceAll('{destination}', encodeURIComponent(destination))
    .replaceAll('{departureDate}', encodeURIComponent(departureDate))
    .replaceAll('{returnDate}', encodeURIComponent(returnDate ?? ''));

  // Strip empty query values (e.g. return=)
  try {
    const parsed = new URL(url);
    for (const [key, value] of parsed.searchParams.entries()) {
      if (!value) parsed.searchParams.delete(key);
    }
    url = parsed.toString();
  } catch {
    url = portal.baseUrl;
  }

  return { url, searchHint };
}

export function matchPortalCard(
  portal: IssuerTravelPortal,
  cards: ChannelPortfolioCard[],
  preferredUserCardId?: string | null,
): ChannelPortfolioCard | null {
  const bankMatched = cards.filter((card) => {
    const bankSlug = card.bankSlug?.toLowerCase() ?? '';
    const bankName = card.bankName.toLowerCase();
    return (
      bankSlug === portal.bankSlug ||
      bankName.includes(portal.bankSlug) ||
      bankName.includes(portal.bankName.toLowerCase().split(' ')[0] ?? '')
    );
  });

  const hintMatched =
    bankMatched.length > 0
      ? bankMatched
      : cards.filter((card) =>
          portal.supportedCardHints.some((hint) =>
            card.cardName.toLowerCase().includes(hint.toLowerCase()),
          ),
        );

  if (preferredUserCardId) {
    const preferred = hintMatched.find((card) => card.userCardId === preferredUserCardId);
    if (preferred) return preferred;
  }

  return hintMatched[0] ?? bankMatched[0] ?? null;
}

export function estimatePortalEconomics(
  portal: IssuerTravelPortal,
  estimatedGrossInr: number,
): {
  estimatedRewardValueInr: number;
  estimatedEffectiveCostInr: number;
  estimatedAccelerationLiftInr: number;
  baselineRewardValueInr: number;
} {
  const rule = portal.acceleration;
  const unitsAt1x = (estimatedGrossInr / 100) * rule.pointsPerHundredInr;
  const portalPoints = unitsAt1x * rule.multiplier;
  const baselinePoints = unitsAt1x * rule.baselineMultiplier;
  const estimatedRewardValueInr = roundInr(portalPoints * rule.pointValueInr);
  const baselineRewardValueInr = roundInr(baselinePoints * rule.pointValueInr);
  const estimatedAccelerationLiftInr = roundInr(estimatedRewardValueInr - baselineRewardValueInr);
  const estimatedEffectiveCostInr = roundInr(estimatedGrossInr - estimatedRewardValueInr);
  return {
    estimatedRewardValueInr,
    estimatedEffectiveCostInr,
    estimatedAccelerationLiftInr,
    baselineRewardValueInr,
  };
}

function buildPortalExplanations(input: {
  portal: IssuerTravelPortal;
  economics: ReturnType<typeof estimatePortalEconomics>;
  matchedCard: ChannelPortfolioCard | null;
  estimatedGrossInr: number;
}): BookingExplanationFactor[] {
  const { portal, economics, matchedCard, estimatedGrossInr } = input;
  const factors: BookingExplanationFactor[] = [
    {
      code: 'PORTAL_ACCELERATION',
      label: `${portal.acceleration.multiplier}X on ${portal.name}`,
      detail: portal.acceleration.summary,
      impactInr: economics.estimatedAccelerationLiftInr,
    },
    {
      code: 'EFFECTIVE_COST',
      label: 'Estimated effective cost',
      detail: `Sticker ~₹${estimatedGrossInr.toLocaleString('en-IN')} → effective ~₹${economics.estimatedEffectiveCostInr.toLocaleString('en-IN')} after portal earn`,
      impactInr: estimatedGrossInr - economics.estimatedEffectiveCostInr,
    },
  ];

  if (matchedCard) {
    factors.push({
      code: 'PORTFOLIO_CARD',
      label: 'Portfolio card match',
      detail: `Use ${matchedCard.cardName} (${matchedCard.bankName}) on this portal`,
      impactInr: null,
    });
  } else {
    factors.push({
      code: 'NO_PORTFOLIO_MATCH',
      label: 'No matching portfolio card',
      detail: `Add an eligible ${portal.bankName} card to unlock estimated acceleration`,
      impactInr: null,
    });
  }

  factors.push({
    code: 'EXTERNAL_HANDOFF',
    label: 'External booking required',
    detail: 'You will finish the reservation on the bank portal (not inside CardOrbit)',
    impactInr: null,
  });

  return factors;
}

export function rankPortalChannels(input: {
  product: BookingProduct;
  recommendInput: BookingChannelRecommendInput;
  context: ChannelRankerContext;
  portals?: IssuerTravelPortal[];
  estimatedGrossInr?: number;
}): BookingChannelRecommendation[] {
  const estimatedGrossInr = roundInr(
    input.estimatedGrossInr ?? input.recommendInput.estimatedGrossInr ?? DEFAULT_GROSS_INR,
  );
  const portals =
    input.portals ??
    listActivePortals(input.product).filter((portal) => portal.products.includes(input.product));

  const recommendations = portals.map((portal) => {
    const matchedCard = matchPortalCard(
      portal,
      input.context.cards,
      input.recommendInput.userCardId ?? input.context.preferredUserCardId,
    );
    const economics = estimatePortalEconomics(portal, estimatedGrossInr);
    const { url, searchHint } = buildDeepLinkUrl(portal, input.recommendInput);
    const portfolioBoost = matchedCard ? 500 : 0;

    return {
      channelId: portal.id,
      slug: portal.slug,
      name: portal.name,
      bankName: portal.bankName,
      kind: 'PORTAL_HANDOFF' as const,
      product: input.product,
      rank: 0,
      requiresExternalBooking: true,
      deepLinkUrl: url,
      searchHint,
      accelerationSummary: portal.acceleration.summary,
      estimatedGrossInr,
      estimatedRewardValueInr: economics.estimatedRewardValueInr,
      estimatedEffectiveCostInr: economics.estimatedEffectiveCostInr,
      estimatedAccelerationLiftInr: economics.estimatedAccelerationLiftInr,
      recommendedUserCardId: matchedCard?.userCardId ?? null,
      recommendedCardName: matchedCard?.cardName ?? null,
      portfolioMatch: matchedCard != null,
      explanations: buildPortalExplanations({
        portal,
        economics,
        matchedCard,
        estimatedGrossInr,
      }),
      eligibilityNotes: portal.eligibilityNotes ?? portal.acceleration.eligibilityNotes ?? null,
      sortKey: economics.estimatedEffectiveCostInr - portfolioBoost,
    };
  });

  return recommendations
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _, ...rest }, index) => ({
      ...rest,
      rank: index + 1,
    }));
}

export function buildDirectChannelRecommendation(input: {
  product: BookingProduct;
  estimatedGrossInr: number;
  directEffectiveCostInr: number | null;
  recommendedUserCardId: string | null;
  recommendedCardName: string | null;
}): BookingChannelRecommendation | null {
  if (input.directEffectiveCostInr == null) return null;
  const rewardValue = Math.max(0, roundInr(input.estimatedGrossInr - input.directEffectiveCostInr));
  return {
    channelId: 'channel_cardwise_direct',
    slug: 'cardwise-direct',
    name: 'CardOrbit',
    bankName: 'CardOrbit',
    kind: 'DIRECT',
    product: input.product,
    rank: 1,
    requiresExternalBooking: false,
    deepLinkUrl: 'https://cardwise.app/account/travel/booking',
    searchHint: null,
    accelerationSummary: 'CardOrbit effective-cost ranking across mock/GDS inventory',
    estimatedGrossInr: input.estimatedGrossInr,
    estimatedRewardValueInr: rewardValue,
    estimatedEffectiveCostInr: roundInr(input.directEffectiveCostInr),
    estimatedAccelerationLiftInr: 0,
    recommendedUserCardId: input.recommendedUserCardId,
    recommendedCardName: input.recommendedCardName,
    portfolioMatch: input.recommendedUserCardId != null,
    explanations: [
      {
        code: 'DIRECT_CHANNEL',
        label: 'Book in CardOrbit',
        detail: 'Search and compare inventory inside CardOrbit (supplier-agnostic foundation)',
        impactInr: null,
      },
      {
        code: 'EFFECTIVE_COST',
        label: 'Best CardOrbit effective cost',
        detail: `Effective ~₹${roundInr(input.directEffectiveCostInr).toLocaleString('en-IN')}`,
        impactInr: rewardValue,
      },
    ],
    eligibilityNotes: null,
  };
}

export function buildChannelRecommendResult(input: {
  product: BookingProduct;
  recommendInput: BookingChannelRecommendInput;
  context: ChannelRankerContext;
  directEffectiveCostInr?: number | null;
  recommendedUserCardId?: string | null;
  recommendedCardName?: string | null;
  generatedAt?: Date;
}): BookingChannelRecommendResult {
  const estimatedGrossInr = roundInr(
    input.recommendInput.estimatedGrossInr ??
      (input.directEffectiveCostInr != null
        ? Math.max(input.directEffectiveCostInr * 1.08, DEFAULT_GROSS_INR * 0.8)
        : DEFAULT_GROSS_INR),
  );

  const portals = rankPortalChannels({
    product: input.product,
    recommendInput: input.recommendInput,
    context: input.context,
    estimatedGrossInr,
  });

  const direct = buildDirectChannelRecommendation({
    product: input.product,
    estimatedGrossInr,
    directEffectiveCostInr:
      input.directEffectiveCostInr ?? input.recommendInput.directEffectiveCostInr ?? null,
    recommendedUserCardId: input.recommendedUserCardId ?? null,
    recommendedCardName: input.recommendedCardName ?? null,
  });

  const combined = [...(direct ? [direct] : []), ...portals].sort((a, b) => {
    // Prefer portfolio-matched portals when effective costs are close
    if (Math.abs(a.estimatedEffectiveCostInr - b.estimatedEffectiveCostInr) < 200) {
      if (a.portfolioMatch !== b.portfolioMatch) return a.portfolioMatch ? -1 : 1;
    }
    return a.estimatedEffectiveCostInr - b.estimatedEffectiveCostInr;
  });

  const ranked = combined.map((channel, index) => ({ ...channel, rank: index + 1 }));

  return {
    product: input.product,
    estimatedGrossInr,
    channelCount: ranked.length,
    channels: ranked,
    directChannel: ranked.find((c) => c.kind === 'DIRECT') ?? direct,
    disclosure: DISCLOSURE,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
  };
}

function roundInr(value: number): number {
  return Math.round(value);
}
