import { z } from 'zod';

export const StatementStatusSchema = z.enum(['OPEN', 'PAID', 'OVERDUE', 'PARTIAL']);
export type StatementStatus = z.infer<typeof StatementStatusSchema>;

export const BillDisplayStatusSchema = z.enum([
  'UPCOMING',
  'OPEN',
  'PAID',
  'OVERDUE',
  'PARTIAL',
  'PROCESSING',
]);
export type BillDisplayStatus = z.infer<typeof BillDisplayStatusSchema>;

export const BillPaymentStatusSchema = z.enum(['COMPLETED', 'PROCESSING', 'FAILED']);
export type BillPaymentStatus = z.infer<typeof BillPaymentStatusSchema>;

export const ListStatementsQuerySchema = z.object({
  userCardId: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListStatementsQuery = z.infer<typeof ListStatementsQuerySchema>;

export const CreateStatementSchema = z.object({
  userCardId: z.string().trim().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  statementDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  totalAmountInr: z.number().nonnegative(),
  minimumDueInr: z.number().nonnegative(),
  previousBalanceInr: z.number().nonnegative().optional(),
  creditsInr: z.number().nonnegative().optional(),
  paymentsInr: z.number().nonnegative().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type CreateStatementInput = z.infer<typeof CreateStatementSchema>;

export const PatchStatementSchema = z
  .object({
    totalAmountInr: z.number().nonnegative().optional(),
    minimumDueInr: z.number().nonnegative().optional(),
    previousBalanceInr: z.number().nonnegative().nullable().optional(),
    creditsInr: z.number().nonnegative().nullable().optional(),
    paymentsInr: z.number().nonnegative().nullable().optional(),
    dueDate: z.string().datetime().optional(),
    status: StatementStatusSchema.optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type PatchStatementInput = z.infer<typeof PatchStatementSchema>;

export const RecordBillPaymentSchema = z.object({
  amountInr: z.number().positive(),
  paidAt: z.string().datetime(),
  status: BillPaymentStatusSchema.default('COMPLETED'),
  notes: z.string().trim().max(1000).optional(),
});

export type RecordBillPaymentInput = z.infer<typeof RecordBillPaymentSchema>;

export const ListBillsQuerySchema = z.object({
  userCardId: z.string().trim().min(1).optional(),
  includePaid: z.coerce.boolean().default(false),
});

export type ListBillsQuery = z.infer<typeof ListBillsQuerySchema>;

export const BillingCalendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type BillingCalendarQuery = z.infer<typeof BillingCalendarQuerySchema>;

export const StatementSummarySchema = z.object({
  id: z.string(),
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  statementDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  totalAmountInr: z.number().nonnegative(),
  minimumDueInr: z.number().nonnegative(),
  status: StatementStatusSchema,
  transactionCount: z.number().int().nonnegative(),
  spendInPeriodInr: z.number().nonnegative(),
});

export type StatementSummary = z.infer<typeof StatementSummarySchema>;

export const StatementDetailSchema = StatementSummarySchema.extend({
  previousBalanceInr: z.number().nonnegative().nullable(),
  creditsInr: z.number().nonnegative().nullable(),
  paymentsInr: z.number().nonnegative().nullable(),
  notes: z.string().nullable(),
  paymentsRecordedInr: z.number().nonnegative(),
});

export type StatementDetail = z.infer<typeof StatementDetailSchema>;

export const StatementListResponseSchema = z.object({
  items: z.array(StatementSummarySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type StatementListResponse = z.infer<typeof StatementListResponseSchema>;

export const BillSummarySchema = z.object({
  id: z.string(),
  kind: z.enum(['statement', 'upcoming']),
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  dueDate: z.string().datetime(),
  daysUntilDue: z.number().int(),
  totalDueInr: z.number().nonnegative().nullable(),
  minimumDueInr: z.number().nonnegative().nullable(),
  estimatedSpendInr: z.number().nonnegative().nullable(),
  status: BillDisplayStatusSchema,
  statementId: z.string().nullable(),
  statementDay: z.number().int().nullable(),
  dueDay: z.number().int().nullable(),
});

export type BillSummary = z.infer<typeof BillSummarySchema>;

export const BillListResponseSchema = z.object({
  items: z.array(BillSummarySchema),
  overdueCount: z.number().int().nonnegative(),
  upcomingCount: z.number().int().nonnegative(),
});

export type BillListResponse = z.infer<typeof BillListResponseSchema>;

export const BillPaymentRecordSchema = z.object({
  id: z.string(),
  amountInr: z.number().positive(),
  paidAt: z.string().datetime(),
  status: BillPaymentStatusSchema,
  notes: z.string().nullable(),
});

export type BillPaymentRecord = z.infer<typeof BillPaymentRecordSchema>;

export const BillDetailSchema = BillSummarySchema.extend({
  periodStart: z.string().datetime().nullable(),
  periodEnd: z.string().datetime().nullable(),
  statementDate: z.string().datetime().nullable(),
  previousBalanceInr: z.number().nonnegative().nullable(),
  creditsInr: z.number().nonnegative().nullable(),
  paymentsInr: z.number().nonnegative().nullable(),
  payments: z.array(BillPaymentRecordSchema),
  autopay: z.object({
    enabled: z.boolean(),
    status: z.enum(['NOT_CONFIGURED', 'ACTIVE', 'PAUSED', 'FAILED']),
    method: z.string().nullable(),
    nextPaymentAt: z.string().datetime().nullable(),
  }),
});

export type BillDetail = z.infer<typeof BillDetailSchema>;

export const BillingCalendarDaySchema = z.object({
  date: z.string(),
  dueBills: z.array(
    z.object({
      billId: z.string(),
      cardName: z.string(),
      amountInr: z.number().nonnegative().nullable(),
      status: BillDisplayStatusSchema,
    }),
  ),
  statementDates: z.array(
    z.object({
      userCardId: z.string(),
      cardName: z.string(),
    }),
  ),
});

export type BillingCalendarDay = z.infer<typeof BillingCalendarDaySchema>;

export const BillingCalendarResponseSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  days: z.array(BillingCalendarDaySchema),
});

export type BillingCalendarResponse = z.infer<typeof BillingCalendarResponseSchema>;

export function parseListStatementsQuery(input: unknown): ListStatementsQuery {
  return ListStatementsQuerySchema.parse(input ?? {});
}

export function parseCreateStatementInput(input: unknown): CreateStatementInput {
  return CreateStatementSchema.parse(input);
}

export function parsePatchStatementInput(input: unknown): PatchStatementInput {
  return PatchStatementSchema.parse(input);
}

export function parseRecordBillPaymentInput(input: unknown): RecordBillPaymentInput {
  return RecordBillPaymentSchema.parse(input);
}

export function parseListBillsQuery(input: unknown): ListBillsQuery {
  return ListBillsQuerySchema.parse(input ?? {});
}

export function parseBillingCalendarQuery(input: unknown): BillingCalendarQuery {
  return BillingCalendarQuerySchema.parse(input ?? {});
}

export const UPCOMING_BILL_ID_PREFIX = 'upcoming:';

export function isUpcomingBillId(id: string): boolean {
  return id.startsWith(UPCOMING_BILL_ID_PREFIX);
}
