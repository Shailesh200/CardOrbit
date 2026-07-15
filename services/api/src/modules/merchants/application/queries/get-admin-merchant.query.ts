import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';

export type AdminMerchantDetailDto = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  brandName: string | null;
  parentBrand: string | null;
  popularityScore: number;
  tags: string[];
  active: boolean;
  category: { id: string; code: string; name: string; slug: string } | null;
  aliases: Array<{ id: string; alias: string }>;
  mccMappings: Array<{ id: string; mccCode: string; description: string | null }>;
  mappingIssues: string[];
};

@Injectable()
export class GetAdminMerchantQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<AdminMerchantDetailDto> {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id, deletedAt: null },
      include: {
        primaryCategory: true,
        aliases: { where: { deletedAt: null }, orderBy: { alias: 'asc' } },
        mccMappings: { where: { deletedAt: null }, orderBy: { mccCode: 'asc' } },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const tags = Array.isArray(merchant.tags)
      ? merchant.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];

    const mappingIssues: string[] = [];
    if (!merchant.primaryCategoryId) mappingIssues.push('missing_category');
    if (merchant.aliases.length === 0) mappingIssues.push('missing_aliases');
    if (!merchant.website) mappingIssues.push('missing_website');

    return {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      logoUrl: merchant.logoUrl,
      website: merchant.website,
      brandName: merchant.brandName,
      parentBrand: merchant.parentBrand,
      popularityScore: merchant.popularityScore,
      tags,
      active: merchant.active,
      category: merchant.primaryCategory
        ? {
            id: merchant.primaryCategory.id,
            code: merchant.primaryCategory.code,
            name: merchant.primaryCategory.name,
            slug: merchant.primaryCategory.slug,
          }
        : null,
      aliases: merchant.aliases.map((alias: { id: string; alias: string }) => ({
        id: alias.id,
        alias: alias.alias,
      })),
      mccMappings: merchant.mccMappings.map(
        (mapping: { id: string; mccCode: string; description: string | null }) => ({
          id: mapping.id,
          mccCode: mapping.mccCode,
          description: mapping.description,
        }),
      ),
      mappingIssues,
    };
  }
}
