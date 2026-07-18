import type { CardBenefit, CardFee, CreditCard, UserCard, UserCardStatus } from '@prisma/client';

type BankRow = { id: string; name: string; slug: string; logoUrl: string | null };
type NetworkRow = { id: string; code: string; name: string };

type CreditCardWithRelations = CreditCard & {
  bank: BankRow;
  network: NetworkRow;
  benefits?: Array<
    Pick<CardBenefit, 'id' | 'title' | 'description' | 'sourceUrl'> & {
      benefitType?: { name: string; code: string };
    }
  >;
  fees?: CardFee[];
  _count?: { benefits: number };
};

type UserCardWithCard = UserCard & {
  creditCard: CreditCardWithRelations;
};

export type CatalogCardDto = {
  id: string;
  name: string;
  slug: string;
  tier: string;
  annualFeeInr: string | null;
  joiningFeeInr: string | null;
  sourceUrl: string | null;
  bank: { id: string; name: string; slug: string; logoUrl: string | null };
  network: { id: string; code: string; name: string };
  benefitCount: number;
  inPortfolio: boolean;
  userCardId: string | null;
};

export type PortfolioCardSummaryDto = {
  id: string;
  creditCardId: string;
  nickname: string | null;
  isFavorite: boolean;
  status: UserCardStatus;
  addedAt: string;
  card: {
    name: string;
    slug: string;
    tier: string;
    annualFeeInr: string | null;
    sourceUrl?: string | null;
    bank: { id: string; name: string; slug: string };
    network: { code: string; name: string };
  };
  benefitCount: number;
  topBenefits: string[];
};

export type PortfolioCardDetailDto = PortfolioCardSummaryDto & {
  statementDay: number | null;
  dueDay: number | null;
  sourceUrl: string | null;
  benefits: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    sourceUrl: string | null;
  }>;
  fees: Array<{
    id: string;
    feeType: string;
    amountInr: string | null;
  }>;
};

function decimalToString(value: { toString(): string } | null | undefined): string | null {
  return value?.toString() ?? null;
}

export function toCatalogCardDto(
  card: CreditCardWithRelations,
  userId: string,
  userCardsByCreditId: Map<string, { id: string; status: UserCardStatus }>,
): CatalogCardDto {
  const owned = userCardsByCreditId.get(card.id);
  const inPortfolio = Boolean(owned && owned.status !== 'REMOVED');

  return {
    id: card.id,
    name: card.name,
    slug: card.slug,
    tier: card.tier,
    annualFeeInr: decimalToString(card.annualFeeInr),
    joiningFeeInr: decimalToString(card.joiningFeeInr),
    sourceUrl: card.sourceUrl ?? null,
    bank: {
      id: card.bank.id,
      name: card.bank.name,
      slug: card.bank.slug,
      logoUrl: card.bank.logoUrl,
    },
    network: {
      id: card.network.id,
      code: card.network.code,
      name: card.network.name,
    },
    benefitCount: card._count?.benefits ?? 0,
    inPortfolio,
    userCardId: inPortfolio ? (owned?.id ?? null) : null,
  };
}

export function toPortfolioSummaryDto(row: UserCardWithCard): PortfolioCardSummaryDto {
  const benefits = row.creditCard.benefits ?? [];
  return {
    id: row.id,
    creditCardId: row.creditCardId,
    nickname: row.nickname,
    isFavorite: row.isFavorite,
    status: row.status,
    addedAt: row.addedAt.toISOString(),
    card: {
      name: row.creditCard.name,
      slug: row.creditCard.slug,
      tier: row.creditCard.tier,
      annualFeeInr: decimalToString(row.creditCard.annualFeeInr),
      sourceUrl: row.creditCard.sourceUrl ?? null,
      bank: {
        id: row.creditCard.bank.id,
        name: row.creditCard.bank.name,
        slug: row.creditCard.bank.slug,
      },
      network: {
        code: row.creditCard.network.code,
        name: row.creditCard.network.name,
      },
    },
    benefitCount: benefits.length,
    topBenefits: benefits.slice(0, 3).map((b) => b.title),
  };
}

export function toPortfolioDetailDto(row: UserCardWithCard): PortfolioCardDetailDto {
  const summary = toPortfolioSummaryDto(row);
  const benefits = row.creditCard.benefits ?? [];
  const fees = row.creditCard.fees ?? [];

  return {
    ...summary,
    statementDay: row.statementDay,
    dueDay: row.dueDay,
    sourceUrl: row.creditCard.sourceUrl ?? null,
    benefits: benefits.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      type: b.benefitType?.name ?? 'Benefit',
      sourceUrl: b.sourceUrl ?? row.creditCard.sourceUrl ?? null,
    })),
    fees: fees.map((f) => ({
      id: f.id,
      feeType: f.feeType,
      amountInr: decimalToString(f.amountInr),
    })),
  };
}
