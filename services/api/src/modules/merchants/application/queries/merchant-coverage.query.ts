import { Injectable } from '@nestjs/common';
import type { Merchant, MerchantCategory } from '@prisma/client';

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';

export type MerchantCoverageDto = {
  totalActive: number;
  withCategory: number;
  withAliases: number;
  withWebsite: number;
  withMccOverride: number;
  globalMccMappings: number;
  avgAliasesPerMerchant: number;
  categoryBreakdown: Array<{
    categoryCode: string;
    categoryName: string;
    merchantCount: number;
  }>;
  mappingQuality: {
    categoryCoveragePct: number;
    aliasCoveragePct: number;
    websiteCoveragePct: number;
  };
  lowQualitySample: Array<{
    id: string;
    name: string;
    slug: string;
    aliasCount: number;
    issues: string[];
  }>;
};

@Injectable()
export class MerchantCoverageQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(limit = 10): Promise<MerchantCoverageDto> {
    const activeWhere = { deletedAt: null, active: true } as const;

    const [
      totalActive,
      withCategory,
      withWebsite,
      withMccOverride,
      globalMccMappings,
      aliasAgg,
      categoryGroups,
      lowQualityRows,
    ] = await Promise.all([
      this.prisma.merchant.count({ where: activeWhere }),
      this.prisma.merchant.count({
        where: { ...activeWhere, primaryCategoryId: { not: null } },
      }),
      this.prisma.merchant.count({
        where: { ...activeWhere, website: { not: null } },
      }),
      this.prisma.merchant.count({
        where: {
          ...activeWhere,
          mccMappings: { some: { deletedAt: null } },
        },
      }),
      this.prisma.mccMapping.count({
        where: { merchantId: null, deletedAt: null },
      }),
      this.prisma.merchantAlias.groupBy({
        by: ['merchantId'],
        where: { deletedAt: null, merchant: activeWhere },
        _count: { _all: true },
      }),
      this.prisma.merchant.groupBy({
        by: ['primaryCategoryId'],
        where: activeWhere,
        _count: { _all: true },
      }),
      this.prisma.merchant.findMany({
        where: {
          ...activeWhere,
          OR: [{ primaryCategoryId: null }, { aliases: { none: { deletedAt: null } } }],
        },
        include: {
          _count: { select: { aliases: { where: { deletedAt: null } } } },
        },
        orderBy: { name: 'asc' },
        take: limit,
      }),
    ]);

    const withAliases = aliasAgg.length;
    const totalAliasCount = aliasAgg.reduce(
      (sum: number, row: { _count: { _all: number } }) => sum + row._count._all,
      0,
    );
    const avgAliasesPerMerchant = totalActive > 0 ? totalAliasCount / totalActive : 0;

    const categoryIds = categoryGroups
      .map((row: { primaryCategoryId: string | null }) => row.primaryCategoryId)
      .filter((id: string | null): id is string => Boolean(id));
    const categories = categoryIds.length
      ? await this.prisma.merchantCategory.findMany({
          where: { id: { in: categoryIds } },
        })
      : [];
    const categoryById = new Map<string, MerchantCategory>(
      categories.map((category) => [category.id, category]),
    );

    const categoryBreakdown = categoryGroups
      .filter((row: { primaryCategoryId: string | null }) => row.primaryCategoryId)
      .map((row: { primaryCategoryId: string | null; _count: { _all: number } }) => {
        const category = categoryById.get(row.primaryCategoryId!);
        return {
          categoryCode: category?.code ?? 'UNKNOWN',
          categoryName: category?.name ?? 'Uncategorized',
          merchantCount: row._count._all,
        };
      })
      .sort(
        (a: { merchantCount: number }, b: { merchantCount: number }) =>
          b.merchantCount - a.merchantCount,
      );

    const pct = (count: number) =>
      totalActive > 0 ? Math.round((count / totalActive) * 1000) / 10 : 0;

    return {
      totalActive,
      withCategory,
      withAliases,
      withWebsite,
      withMccOverride,
      globalMccMappings,
      avgAliasesPerMerchant: Math.round(avgAliasesPerMerchant * 10) / 10,
      categoryBreakdown,
      mappingQuality: {
        categoryCoveragePct: pct(withCategory),
        aliasCoveragePct: pct(withAliases),
        websiteCoveragePct: pct(withWebsite),
      },
      lowQualitySample: lowQualityRows.map(
        (merchant: Merchant & { _count: { aliases: number } }) => {
          const issues: string[] = [];
          if (!merchant.primaryCategoryId) issues.push('missing_category');
          if (merchant._count.aliases === 0) issues.push('missing_aliases');
          return {
            id: merchant.id,
            name: merchant.name,
            slug: merchant.slug,
            aliasCount: merchant._count.aliases,
            issues,
          };
        },
      ),
    };
  }
}
