import { z } from 'zod';

export const MAX_FAVORITE_MERCHANTS = 50;
export const MAX_SAVED_SEARCHES = 20;

export const SavedSearchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  query: z.string().max(200),
  categorySlug: z.string().max(160).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedSearch = z.infer<typeof SavedSearchSchema>;

export const FavoriteMerchantSchema = z.object({
  id: z.string().min(1),
  merchantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  merchant: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    category: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
      })
      .nullable(),
  }),
});

export type FavoriteMerchant = z.infer<typeof FavoriteMerchantSchema>;

export const CreateSavedSearchSchema = z.object({
  name: z.string().trim().min(1).max(80),
  query: z.string().trim().max(200).default(''),
  categorySlug: z.string().trim().max(160).nullable().optional(),
});

export type CreateSavedSearchInput = z.infer<typeof CreateSavedSearchSchema>;

export const UpdateSavedSearchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    query: z.string().trim().max(200).optional(),
    categorySlug: z.string().trim().max(160).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type UpdateSavedSearchInput = z.infer<typeof UpdateSavedSearchSchema>;

export const AddFavoriteMerchantSchema = z
  .object({
    merchantId: z.string().uuid().optional(),
    slug: z.string().trim().min(1).max(160).optional(),
  })
  .refine((value) => Boolean(value.merchantId || value.slug), {
    message: 'merchantId or slug is required',
  });

export type AddFavoriteMerchantInput = z.infer<typeof AddFavoriteMerchantSchema>;

export function parseCreateSavedSearchInput(input: unknown): CreateSavedSearchInput {
  return CreateSavedSearchSchema.parse(input);
}

export function parseUpdateSavedSearchInput(input: unknown): UpdateSavedSearchInput {
  return UpdateSavedSearchSchema.parse(input);
}

export function parseAddFavoriteMerchantInput(input: unknown): AddFavoriteMerchantInput {
  return AddFavoriteMerchantSchema.parse(input);
}
