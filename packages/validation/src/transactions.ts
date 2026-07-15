import { z } from 'zod';

export const TRANSACTION_CATEGORY_SLUGS = [
  'dining',
  'travel',
  'groceries',
  'fuel',
  'online',
  'shopping',
  'entertainment',
  'utilities',
  'healthcare',
  'education',
  'other',
] as const;

export const TransactionCategorySlugSchema = z.enum(TRANSACTION_CATEGORY_SLUGS);
export type TransactionCategorySlug = z.infer<typeof TransactionCategorySlugSchema>;

export const TransactionStatusSchema = z.enum(['POSTED', 'PENDING', 'FAILED', 'REFUND']);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const TransactionSourceSchema = z.enum(['MANUAL', 'CSV_IMPORT', 'GMAIL_SYNC']);
export type TransactionSource = z.infer<typeof TransactionSourceSchema>;

export const ListTransactionsQuerySchema = z.object({
  userCardId: z.string().trim().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  categorySlug: TransactionCategorySlugSchema.optional(),
  status: TransactionStatusSchema.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;

export const CreateTransactionSchema = z.object({
  userCardId: z.string().trim().min(1),
  amountInr: z.number().positive(),
  merchantName: z.string().trim().min(1).max(200),
  categorySlug: TransactionCategorySlugSchema.optional(),
  status: TransactionStatusSchema.default('POSTED'),
  transactedAt: z.string().datetime(),
  notes: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  externalRef: z.string().trim().max(200).optional(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const ImportTransactionsSchema = z.object({
  csv: z.string().trim().min(1).max(500_000),
  defaultUserCardId: z.string().trim().min(1).optional(),
});

export type ImportTransactionsInput = z.infer<typeof ImportTransactionsSchema>;

export const PatchTransactionSchema = z
  .object({
    categorySlug: TransactionCategorySlugSchema.optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
    status: TransactionStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type PatchTransactionInput = z.infer<typeof PatchTransactionSchema>;

export const TransactionSummarySchema = z.object({
  id: z.string(),
  userCardId: z.string(),
  cardName: z.string(),
  bankName: z.string(),
  amountInr: z.number(),
  currency: z.string(),
  merchantName: z.string(),
  merchantSlug: z.string().nullable(),
  categorySlug: z.string(),
  categoryLabel: z.string(),
  status: TransactionStatusSchema,
  source: TransactionSourceSchema,
  transactedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type TransactionSummary = z.infer<typeof TransactionSummarySchema>;

export const TransactionDetailSchema = TransactionSummarySchema.extend({
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  externalRef: z.string().nullable(),
  merchantId: z.string().uuid().nullable(),
});

export type TransactionDetail = z.infer<typeof TransactionDetailSchema>;

export const TransactionListResponseSchema = z.object({
  items: z.array(TransactionSummarySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  summary: z.object({
    totalVolumeInr: z.number().nonnegative(),
    transactionCount: z.number().int().nonnegative(),
    categoryCounts: z.array(
      z.object({
        slug: z.string(),
        label: z.string(),
        count: z.number().int().nonnegative(),
      }),
    ),
  }),
});

export type TransactionListResponse = z.infer<typeof TransactionListResponseSchema>;

export const TransactionImportResultSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(
    z.object({
      line: z.number().int().positive(),
      message: z.string(),
    }),
  ),
});

export type TransactionImportResult = z.infer<typeof TransactionImportResultSchema>;

export function parseListTransactionsQuery(input: unknown): ListTransactionsQuery {
  return ListTransactionsQuerySchema.parse(input ?? {});
}

export function parseCreateTransactionInput(input: unknown): CreateTransactionInput {
  return CreateTransactionSchema.parse(input);
}

export function parseImportTransactionsInput(input: unknown): ImportTransactionsInput {
  return ImportTransactionsSchema.parse(input);
}

export function parsePatchTransactionInput(input: unknown): PatchTransactionInput {
  return PatchTransactionSchema.parse(input);
}

export function normalizeTransactionCategorySlug(
  value: string | undefined | null,
): TransactionCategorySlug {
  const normalized = value?.trim().toLowerCase().replaceAll(/\s+/g, '_') ?? '';
  if ((TRANSACTION_CATEGORY_SLUGS as readonly string[]).includes(normalized)) {
    return normalized as TransactionCategorySlug;
  }
  return 'other';
}
