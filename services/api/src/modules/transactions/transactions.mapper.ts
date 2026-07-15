import {
  SPENDING_CATEGORY_LABELS,
  type TransactionDetail,
  type TransactionSummary,
} from '@cardwise/validation';
import type { Transaction, UserCard } from '@prisma/client';

type CardContext = {
  nickname: string | null;
  creditCard: {
    name: string;
    bank: { name: string };
  };
};

export function categoryLabel(slug: string): string {
  return SPENDING_CATEGORY_LABELS[slug] ?? slug.replaceAll('_', ' ');
}

export function mapTransactionSummary(row: Transaction, card: CardContext): TransactionSummary {
  return {
    id: row.id,
    userCardId: row.userCardId,
    cardName: card.nickname ?? card.creditCard.name,
    bankName: card.creditCard.bank.name,
    amountInr: Number(row.amountInr),
    currency: row.currency,
    merchantName: row.merchantName,
    merchantSlug: row.merchantSlug,
    categorySlug: row.categorySlug,
    categoryLabel: categoryLabel(row.categorySlug),
    status: row.status,
    source: row.source,
    transactedAt: row.transactedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapTransactionDetail(row: Transaction, card: CardContext): TransactionDetail {
  const tags = Array.isArray(row.tags)
    ? row.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  return {
    ...mapTransactionSummary(row, card),
    notes: row.notes,
    tags,
    externalRef: row.externalRef,
    merchantId: row.merchantId,
  };
}

export type UserCardWithCard = UserCard & {
  creditCard: {
    name: string;
    bank: { name: string };
  };
};
