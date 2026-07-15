import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  computeOfferSavingsInr,
  type MatchedOffer,
  type MatchedOfferCard,
  type OfferMatchQuery,
  type OfferMatchResponse,
} from '@cardwise/validation';
import type {
  Offer,
  OfferCardAssignment,
  OfferMerchant,
  Bank,
  CreditCard,
  Merchant,
} from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UserCardsService } from '../user-cards/user-cards.service';

type OfferWithRelations = Offer & {
  issuerBank: Bank | null;
  cardAssignments: Array<
    OfferCardAssignment & {
      creditCard: CreditCard & { bank: Bank };
    }
  >;
  merchants: Array<
    OfferMerchant & {
      merchant: Merchant;
    }
  >;
};

type PortfolioEntry = Awaited<ReturnType<UserCardsService['listPortfolio']>>[number];

@Injectable()
export class OfferMatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userCards: UserCardsService,
  ) {}

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return user;
  }

  async matchOffers(userId: string, query: OfferMatchQuery): Promise<OfferMatchResponse> {
    await this.requireActiveUser(userId);

    const portfolio = await this.userCards
      .listPortfolio(userId)
      .catch(() => [] as PortfolioEntry[]);
    const ownedByCardId = new Map(portfolio.map((entry) => [entry.creditCardId, entry]));

    let merchantId: string | null = null;
    if (query.merchantSlug) {
      const merchant = await this.prisma.merchant.findFirst({
        where: { slug: query.merchantSlug, deletedAt: null, active: true },
        select: { id: true },
      });
      merchantId = merchant?.id ?? null;
    }

    const asOf = new Date();
    const offers = await this.loadOffers(query.status, asOf);

    const items = offers
      .map((offer) =>
        this.evaluateOffer(offer, {
          portfolio,
          ownedByCardId,
          merchantId,
          amountInr: query.amountInr,
        }),
      )
      .filter((item): item is MatchedOffer => item !== null)
      .sort((a, b) => {
        const aSavings = a.bestEstimatedSavingsInr ?? 0;
        const bSavings = b.bestEstimatedSavingsInr ?? 0;
        if (bSavings !== aSavings) return bSavings - aSavings;
        return a.title.localeCompare(b.title);
      });

    const limited = items.slice(0, query.limit);

    return {
      items: limited,
      total: items.length,
      merchantSlug: query.merchantSlug ?? null,
      amountInr: query.amountInr ?? null,
    };
  }

  async getOfferBySlug(
    userId: string,
    slug: string,
    amountInr?: number,
  ): Promise<MatchedOffer | null> {
    await this.requireActiveUser(userId);

    const portfolio = await this.userCards
      .listPortfolio(userId)
      .catch(() => [] as PortfolioEntry[]);
    const ownedByCardId = new Map(portfolio.map((entry) => [entry.creditCardId, entry]));

    const offer = await this.prisma.offer.findFirst({
      where: { slug, deletedAt: null },
      include: this.offerInclude(),
    });

    if (!offer) return null;

    return this.evaluateOffer(offer, {
      portfolio,
      ownedByCardId,
      merchantId: null,
      amountInr,
    });
  }

  async listMerchantOffers(
    userId: string,
    merchantSlug: string,
    amountInr?: number,
  ): Promise<OfferMatchResponse> {
    return this.matchOffers(userId, {
      merchantSlug,
      amountInr,
      limit: 20,
      status: 'active',
    });
  }

  private async loadOffers(
    status: OfferMatchQuery['status'],
    asOf: Date,
  ): Promise<OfferWithRelations[]> {
    if (status === 'historical') {
      return this.prisma.offer.findMany({
        where: {
          deletedAt: null,
          OR: [{ status: { in: ['EXPIRED', 'HISTORICAL'] } }, { validUntil: { lt: asOf } }],
        },
        include: this.offerInclude(),
        orderBy: { validUntil: 'desc' },
        take: 100,
      });
    }

    return this.prisma.offer.findMany({
      where: {
        deletedAt: null,
        status: { in: ['ACTIVE', 'SCHEDULED'] },
        validFrom: { lte: asOf },
        OR: [{ validUntil: null }, { validUntil: { gte: asOf } }],
      },
      include: this.offerInclude(),
      orderBy: { title: 'asc' },
    });
  }

  private offerInclude() {
    return {
      issuerBank: true,
      cardAssignments: {
        where: { deletedAt: null },
        include: {
          creditCard: {
            include: { bank: true },
          },
        },
      },
      merchants: {
        where: { deletedAt: null },
        include: { merchant: true },
      },
    } as const;
  }

  private evaluateOffer(
    offer: OfferWithRelations,
    context: {
      portfolio: PortfolioEntry[];
      ownedByCardId: Map<string, PortfolioEntry>;
      merchantId: string | null;
      amountInr?: number;
    },
  ): MatchedOffer | null {
    const merchants = offer.merchants
      .filter((row) => row.merchant.deletedAt === null && row.merchant.active)
      .map((row) => ({
        id: row.merchant.id,
        slug: row.merchant.slug,
        name: row.merchant.name,
      }));

    if (context.merchantId && merchants.length > 0) {
      const matchesMerchant = merchants.some((merchant) => merchant.id === context.merchantId);
      if (!matchesMerchant) return null;
    }

    const eligibleCards = this.resolveEligibleCards(
      offer,
      context.portfolio,
      context.ownedByCardId,
    );
    const amountInr = context.amountInr ?? null;

    const cardsWithSavings: MatchedOfferCard[] = eligibleCards.map((card) => ({
      ...card,
      estimatedSavingsInr:
        amountInr != null
          ? computeOfferSavingsInr(
              amountInr,
              offer.cashbackPercent?.toString(),
              offer.capInr?.toString(),
            )
          : null,
    }));

    const portfolioEmpty = context.portfolio.length === 0;
    const hasOwnedEligibleCard = cardsWithSavings.some((card) => card.userCardId !== null);
    const isEligible = !portfolioEmpty && hasOwnedEligibleCard;

    let ineligibilityReason: string | null = null;
    if (portfolioEmpty) {
      ineligibilityReason = 'Add a card to your portfolio to use this offer';
    } else if (!hasOwnedEligibleCard) {
      ineligibilityReason = 'None of your portfolio cards qualify for this offer';
    }

    const savingsValues = cardsWithSavings
      .map((card) => card.estimatedSavingsInr)
      .filter((value): value is number => value != null);

    const bestEstimatedSavingsInr = savingsValues.length > 0 ? Math.max(...savingsValues) : null;

    return {
      id: offer.id,
      slug: offer.slug,
      title: offer.title,
      description: offer.description,
      type: offer.type,
      cashbackPercent: offer.cashbackPercent?.toString() ?? null,
      capInr: offer.capInr?.toString() ?? null,
      termsSummary: offer.termsSummary,
      validFrom: offer.validFrom.toISOString(),
      validUntil: offer.validUntil?.toISOString() ?? null,
      status: offer.status,
      merchants,
      eligibleCards: cardsWithSavings,
      bestEstimatedSavingsInr,
      isEligible,
      ineligibilityReason,
    };
  }

  private resolveEligibleCards(
    offer: OfferWithRelations,
    portfolio: PortfolioEntry[],
    ownedByCardId: Map<string, PortfolioEntry>,
  ): MatchedOfferCard[] {
    const assignedCards = offer.cardAssignments
      .filter((row) => row.creditCard.deletedAt === null && row.creditCard.active)
      .map((row) => row.creditCard);

    const toMatchedCard = (card: CreditCard & { bank: Bank }): MatchedOfferCard => ({
      creditCardId: card.id,
      cardSlug: card.slug,
      cardName: card.name,
      bankName: card.bank.name,
      userCardId: ownedByCardId.get(card.id)?.id ?? null,
      estimatedSavingsInr: null,
    });

    const toMatchedCardFromPortfolio = (entry: PortfolioEntry): MatchedOfferCard => ({
      creditCardId: entry.creditCardId,
      cardSlug: entry.card.slug,
      cardName: entry.card.name,
      bankName: entry.card.bank.name,
      userCardId: entry.id,
      estimatedSavingsInr: null,
    });

    if (assignedCards.length > 0) {
      return assignedCards.map(toMatchedCard).sort((a, b) => a.cardName.localeCompare(b.cardName));
    }

    if (offer.issuerBankId) {
      return portfolio
        .filter((entry) => entry.card.bank.id === offer.issuerBankId)
        .map(toMatchedCardFromPortfolio)
        .sort((a, b) => a.cardName.localeCompare(b.cardName));
    }

    return portfolio
      .map(toMatchedCardFromPortfolio)
      .sort((a, b) => a.cardName.localeCompare(b.cardName));
  }
}
