import type {
  BillDetail,
  BillPaymentRecord,
  BillSummary,
  StatementDetail,
  StatementSummary,
} from '@cardwise/validation';
import type { BillPayment, CreditCardStatement } from '@prisma/client';

import {
  buildUpcomingBillId,
  resolveStatementStatus,
  toBillDisplayStatus,
  daysUntil,
} from './billing-dates';

type CardContext = {
  id: string;
  nickname: string | null;
  statementDay: number | null;
  dueDay: number | null;
  creditCard: {
    name: string;
    bank: { name: string };
  };
};

export function mapStatementSummary(input: {
  row: CreditCardStatement;
  card: CardContext;
  transactionCount: number;
  spendInPeriodInr: number;
  today?: Date;
}): StatementSummary {
  const status = resolveStatementStatus({
    storedStatus: input.row.status,
    dueDate: input.row.dueDate,
    today: input.today,
  });

  return {
    id: input.row.id,
    userCardId: input.row.userCardId,
    cardName: input.card.nickname ?? input.card.creditCard.name,
    bankName: input.card.creditCard.bank.name,
    periodStart: input.row.periodStart.toISOString(),
    periodEnd: input.row.periodEnd.toISOString(),
    statementDate: input.row.statementDate.toISOString(),
    dueDate: input.row.dueDate.toISOString(),
    totalAmountInr: Number(input.row.totalAmountInr),
    minimumDueInr: Number(input.row.minimumDueInr),
    status,
    transactionCount: input.transactionCount,
    spendInPeriodInr: input.spendInPeriodInr,
  };
}

export function mapStatementDetail(input: {
  row: CreditCardStatement;
  card: CardContext;
  transactionCount: number;
  spendInPeriodInr: number;
  paymentsRecordedInr: number;
  today?: Date;
}): StatementDetail {
  return {
    ...mapStatementSummary(input),
    previousBalanceInr:
      input.row.previousBalanceInr != null ? Number(input.row.previousBalanceInr) : null,
    creditsInr: input.row.creditsInr != null ? Number(input.row.creditsInr) : null,
    paymentsInr: input.row.paymentsInr != null ? Number(input.row.paymentsInr) : null,
    notes: input.row.notes,
    paymentsRecordedInr: input.paymentsRecordedInr,
  };
}

export function mapBillPaymentRecord(row: BillPayment): BillPaymentRecord {
  return {
    id: row.id,
    amountInr: Number(row.amountInr),
    paidAt: row.paidAt.toISOString(),
    status: row.status,
    notes: row.notes,
  };
}

export function mapStatementBill(input: {
  row: CreditCardStatement;
  card: CardContext;
  estimatedSpendInr: number | null;
  today?: Date;
}): BillSummary {
  const today = input.today ?? new Date();
  const status = resolveStatementStatus({
    storedStatus: input.row.status,
    dueDate: input.row.dueDate,
    today,
  });

  return {
    id: input.row.id,
    kind: 'statement',
    userCardId: input.row.userCardId,
    cardName: input.card.nickname ?? input.card.creditCard.name,
    bankName: input.card.creditCard.bank.name,
    dueDate: input.row.dueDate.toISOString(),
    daysUntilDue: daysUntil(today, input.row.dueDate),
    totalDueInr: Number(input.row.totalAmountInr),
    minimumDueInr: Number(input.row.minimumDueInr),
    estimatedSpendInr: input.estimatedSpendInr,
    status: toBillDisplayStatus({
      kind: 'statement',
      statementStatus: status,
      dueDate: input.row.dueDate,
      today,
    }),
    statementId: input.row.id,
    statementDay: input.card.statementDay,
    dueDay: input.card.dueDay,
  };
}

export function mapUpcomingBill(input: {
  card: CardContext;
  dueDate: Date;
  estimatedSpendInr: number | null;
  today?: Date;
}): BillSummary {
  const today = input.today ?? new Date();
  return {
    id: buildUpcomingBillId(input.card.id, input.dueDate),
    kind: 'upcoming',
    userCardId: input.card.id,
    cardName: input.card.nickname ?? input.card.creditCard.name,
    bankName: input.card.creditCard.bank.name,
    dueDate: input.dueDate.toISOString(),
    daysUntilDue: daysUntil(today, input.dueDate),
    totalDueInr: null,
    minimumDueInr: null,
    estimatedSpendInr: input.estimatedSpendInr,
    status: 'UPCOMING',
    statementId: null,
    statementDay: input.card.statementDay,
    dueDay: input.card.dueDay,
  };
}

export function defaultAutopay() {
  return {
    enabled: false,
    status: 'NOT_CONFIGURED' as const,
    method: null,
    nextPaymentAt: null,
  };
}

export function mapBillDetail(input: {
  bill: BillSummary;
  statement: StatementDetail | null;
  payments: BillPaymentRecord[];
}): BillDetail {
  return {
    ...input.bill,
    periodStart: input.statement?.periodStart ?? null,
    periodEnd: input.statement?.periodEnd ?? null,
    statementDate: input.statement?.statementDate ?? null,
    previousBalanceInr: input.statement?.previousBalanceInr ?? null,
    creditsInr: input.statement?.creditsInr ?? null,
    paymentsInr: input.statement?.paymentsInr ?? null,
    payments: input.payments,
    autopay: defaultAutopay(),
  };
}

export type { CardContext };
