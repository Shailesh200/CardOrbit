import { normalizeTransactionCategorySlug } from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export type ResolvedMerchant = {
  merchantId: string | null;
  merchantSlug: string | null;
  merchantName: string;
  categorySlug: string;
};

export async function resolveMerchantContext(
  prisma: PrismaService,
  merchantName: string,
  categoryHint?: string | null,
): Promise<ResolvedMerchant> {
  const normalizedName = merchantName.trim();
  const categorySlug = normalizeTransactionCategorySlug(categoryHint);

  const merchant = await prisma.merchant.findFirst({
    where: {
      deletedAt: null,
      active: true,
      OR: [
        { name: { equals: normalizedName, mode: 'insensitive' } },
        { brandName: { equals: normalizedName, mode: 'insensitive' } },
        {
          aliases: {
            some: {
              deletedAt: null,
              normalizedAlias: normalizeAlias(normalizedName),
            },
          },
        },
      ],
    },
    include: {
      primaryCategory: true,
    },
    orderBy: { popularityScore: 'desc' },
  });

  if (!merchant) {
    return {
      merchantId: null,
      merchantSlug: null,
      merchantName: normalizedName,
      categorySlug,
    };
  }

  const inferredCategory = merchant.primaryCategory?.slug
    ? normalizeTransactionCategorySlug(merchant.primaryCategory.slug)
    : categorySlug;

  return {
    merchantId: merchant.id,
    merchantSlug: merchant.slug,
    merchantName: merchant.name,
    categorySlug: categoryHint?.trim() ? categorySlug : inferredCategory,
  };
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
