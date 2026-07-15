import type { Merchant, MerchantAlias, MerchantCategory } from '@prisma/client';

export type MerchantCategoryDto = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
};

export type MerchantListItemDto = {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string; slug: string } | null;
  paymentMethods: string[];
  popularityScore: number;
  tags: string[];
};

export type MerchantDetailDto = MerchantListItemDto & {
  website: string | null;
  brandName: string | null;
  parentBrand: string | null;
  aliases: string[];
  offerCount: number;
  isFavorite: boolean;
};

export type MerchantSearchPageDto = {
  items: MerchantListItemDto[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
};

function paymentMethods(value: unknown): string[] {
  if (!Array.isArray(value)) return ['CARD'];
  return value.filter((item): item is string => typeof item === 'string');
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function toMerchantCategoryDto(category: MerchantCategory): MerchantCategoryDto {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    slug: category.slug,
    description: category.description,
  };
}

export function toMerchantListItemDto(
  merchant: Merchant & { primaryCategory?: MerchantCategory | null },
): MerchantListItemDto {
  return {
    id: merchant.id,
    name: merchant.name,
    slug: merchant.slug,
    category: merchant.primaryCategory
      ? {
          id: merchant.primaryCategory.id,
          name: merchant.primaryCategory.name,
          slug: merchant.primaryCategory.slug,
        }
      : null,
    paymentMethods: paymentMethods(merchant.paymentMethods),
    popularityScore: merchant.popularityScore ?? 0,
    tags: tags(merchant.tags),
  };
}

export function toMerchantDetailDto(
  merchant: Merchant & {
    primaryCategory?: MerchantCategory | null;
    aliases: MerchantAlias[];
    _count: { offerMerchants: number };
  },
  options?: { isFavorite?: boolean; offerCount?: number },
): MerchantDetailDto {
  return {
    ...toMerchantListItemDto(merchant),
    website: merchant.website,
    brandName: merchant.brandName,
    parentBrand: merchant.parentBrand,
    aliases: merchant.aliases.map((alias) => alias.alias),
    offerCount: options?.offerCount ?? merchant._count.offerMerchants,
    isFavorite: options?.isFavorite ?? false,
  };
}
