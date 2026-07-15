import { z } from 'zod';

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const nullableUrl = z.union([z.string().url(), z.literal(''), z.null()]).optional();

function normalizeNullableUrl(value: string | null | '' | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === '' || value === null) return null;
  return value;
}

export const UpdateBrandAssetSchema = z.object({
  logoUrl: nullableUrl,
  imageUrl: nullableUrl,
});

export type UpdateBrandAssetInput = z.infer<typeof UpdateBrandAssetSchema>;

export function parseUpdateBrandAssetInput(raw: unknown): UpdateBrandAssetInput {
  const parsed = UpdateBrandAssetSchema.parse(raw);
  return {
    logoUrl: normalizeNullableUrl(parsed.logoUrl),
    imageUrl: normalizeNullableUrl(parsed.imageUrl),
  };
}

export const AdminCreateBankSchema = z.object({
  name: z.string().min(1),
  slug,
  country: z.string().length(2).default('IN'),
  logoUrl: nullableUrl,
});

export const AdminUpdateBankSchema = AdminCreateBankSchema.partial();

export type AdminCreateBankInput = z.infer<typeof AdminCreateBankSchema>;
export type AdminUpdateBankInput = z.infer<typeof AdminUpdateBankSchema>;

export function parseAdminCreateBankInput(raw: unknown): AdminCreateBankInput {
  const parsed = AdminCreateBankSchema.parse(raw);
  return { ...parsed, logoUrl: normalizeNullableUrl(parsed.logoUrl) ?? null };
}

export function parseAdminUpdateBankInput(raw: unknown): AdminUpdateBankInput {
  const parsed = AdminUpdateBankSchema.parse(raw);
  return {
    ...parsed,
    logoUrl: parsed.logoUrl === undefined ? undefined : normalizeNullableUrl(parsed.logoUrl),
  };
}

export const AdminCreateMerchantSchema = z.object({
  name: z.string().min(1),
  slug,
  logoUrl: nullableUrl,
  active: z.boolean().optional(),
});

export const AdminUpdateMerchantSchema = AdminCreateMerchantSchema.partial();

export type AdminCreateMerchantInput = z.infer<typeof AdminCreateMerchantSchema>;
export type AdminUpdateMerchantInput = z.infer<typeof AdminUpdateMerchantSchema>;

export function parseAdminCreateMerchantInput(raw: unknown): AdminCreateMerchantInput {
  const parsed = AdminCreateMerchantSchema.parse(raw);
  return { ...parsed, logoUrl: normalizeNullableUrl(parsed.logoUrl) ?? null };
}

export function parseAdminUpdateMerchantInput(raw: unknown): AdminUpdateMerchantInput {
  const parsed = AdminUpdateMerchantSchema.parse(raw);
  return {
    ...parsed,
    logoUrl: parsed.logoUrl === undefined ? undefined : normalizeNullableUrl(parsed.logoUrl),
  };
}

export const AdminCreateCreditCardSchema = z.object({
  name: z.string().min(1),
  slug,
  bankId: z.string().uuid(),
  networkId: z.string().uuid(),
  imageUrl: nullableUrl,
  annualFeeInr: z.union([z.string(), z.number(), z.null()]).optional(),
  active: z.boolean().optional(),
});

export const AdminUpdateCreditCardSchema = AdminCreateCreditCardSchema.partial();

export type AdminCreateCreditCardInput = z.infer<typeof AdminCreateCreditCardSchema>;
export type AdminUpdateCreditCardInput = z.infer<typeof AdminUpdateCreditCardSchema>;

export function parseAdminCreateCreditCardInput(raw: unknown): AdminCreateCreditCardInput {
  const parsed = AdminCreateCreditCardSchema.parse(raw);
  return {
    ...parsed,
    imageUrl: normalizeNullableUrl(parsed.imageUrl) ?? null,
    annualFeeInr:
      parsed.annualFeeInr === undefined || parsed.annualFeeInr === null
        ? null
        : String(parsed.annualFeeInr),
  };
}

export function parseAdminUpdateCreditCardInput(raw: unknown): AdminUpdateCreditCardInput {
  const parsed = AdminUpdateCreditCardSchema.parse(raw);
  return {
    ...parsed,
    imageUrl: parsed.imageUrl === undefined ? undefined : normalizeNullableUrl(parsed.imageUrl),
    annualFeeInr:
      parsed.annualFeeInr === undefined
        ? undefined
        : parsed.annualFeeInr === null
          ? null
          : String(parsed.annualFeeInr),
  };
}

export const ListAdminAssetsQuerySchema = z.object({
  tab: z.enum(['banks', 'merchants', 'credit-cards']).default('banks'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().optional(),
});

export type ListAdminAssetsQuery = z.infer<typeof ListAdminAssetsQuerySchema>;

export function parseListAdminAssetsQuery(raw: unknown): ListAdminAssetsQuery {
  return ListAdminAssetsQuerySchema.parse(raw);
}
