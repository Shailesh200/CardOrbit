import type {
  BookingExplanationFactor,
  BookingPaymentCardOption,
  BookingPaymentOptimizeResult,
  BookingProduct,
} from '@cardwise/validation';

import { roundInr } from './booking.builder';

export type PaymentOptimizeCard = {
  userCardId: string;
  cardName: string;
  bankName: string;
  cashbackRate: number;
  rewardValueRate: number;
};

export function buildPaymentOptimizeResult(input: {
  offerId?: string | null;
  product: BookingProduct;
  grossPriceInr: number;
  cards: PaymentOptimizeCard[];
  preferredUserCardId?: string | null;
}): BookingPaymentOptimizeResult {
  const gross = roundInr(input.grossPriceInr);

  if (input.cards.length === 0) {
    return {
      offerId: input.offerId ?? null,
      product: input.product,
      grossPriceInr: gross,
      cardCount: 0,
      cards: [],
      recommendedUserCardId: null,
      recommendedCardName: null,
    };
  }

  const ranked = input.cards
    .map((card) => {
      const cashbackInr = roundInr(gross * card.cashbackRate);
      const rewardValueInr = roundInr(gross * card.rewardValueRate);
      const effectiveCostInr = roundInr(gross - cashbackInr - rewardValueInr);
      const explanations: BookingExplanationFactor[] = [
        {
          code: 'CARD_EFFECTIVE',
          label: 'Effective cost with this card',
          detail: `₹${gross.toLocaleString('en-IN')} − cashback ₹${cashbackInr.toLocaleString('en-IN')} − rewards ₹${rewardValueInr.toLocaleString('en-IN')}`,
          impactInr: cashbackInr + rewardValueInr,
        },
        {
          code: 'CASHBACK_RATE',
          label: 'Est. cashback rate',
          detail: `${Math.round(card.cashbackRate * 1000) / 10}% on this travel purchase`,
          impactInr: cashbackInr,
        },
        {
          code: 'REWARD_RATE',
          label: 'Est. reward value',
          detail: `${Math.round(card.rewardValueRate * 1000) / 10}% of fare as points value`,
          impactInr: rewardValueInr,
        },
      ];
      return {
        userCardId: card.userCardId,
        cardName: card.cardName,
        bankName: card.bankName,
        cashbackInr,
        rewardValueInr,
        effectiveCostInr,
        explanations,
        sortKey: effectiveCostInr - (input.preferredUserCardId === card.userCardId ? 50 : 0),
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);

  const cards: BookingPaymentCardOption[] = ranked.map((row, index) => ({
    userCardId: row.userCardId,
    cardName: row.cardName,
    bankName: row.bankName,
    rank: index + 1,
    cashbackInr: row.cashbackInr,
    rewardValueInr: row.rewardValueInr,
    effectiveCostInr: row.effectiveCostInr,
    selected: index === 0,
    explanations: row.explanations,
  }));

  return {
    offerId: input.offerId ?? null,
    product: input.product,
    grossPriceInr: gross,
    cardCount: cards.length,
    cards,
    recommendedUserCardId: cards[0]?.userCardId ?? null,
    recommendedCardName: cards[0]?.cardName ?? null,
  };
}
