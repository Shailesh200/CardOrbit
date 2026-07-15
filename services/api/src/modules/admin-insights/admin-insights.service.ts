import { Injectable } from '@nestjs/common';
import { RULE_TEMPLATES } from '@cardwise/admin-config';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CatalogImportService } from '../catalog-import/catalog-import.service';
import { MerchantCoverageQuery } from '../merchants/application/queries/merchant-coverage.query';

@Injectable()
export class AdminInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogImport: CatalogImportService,
    private readonly merchantCoverage: MerchantCoverageQuery,
  ) {}

  async getOverview() {
    const [
      importStats,
      coverage,
      cardCount,
      offerCount,
      ruleCount,
      userCount,
      bankCount,
      batchCount,
    ] = await Promise.all([
      this.catalogImport.getStats(),
      this.merchantCoverage.execute(),
      this.prisma.creditCard.count({ where: { deletedAt: null, active: true } }),
      this.prisma.offer.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.rewardRule.count({ where: { deletedAt: null } }),
      this.prisma.user.count(),
      this.prisma.bank.count({ where: { deletedAt: null } }),
      this.prisma.catalogImportBatch.count(),
    ]);

    return {
      sections: [
        {
          title: 'Catalog health',
          metrics: [
            {
              label: 'Active cards',
              value: String(cardCount),
              hint: `${bankCount} banks in catalog`,
            },
            { label: 'Active offers', value: String(offerCount) },
            {
              label: 'Reward rules',
              value: String(ruleCount),
              hint: `${RULE_TEMPLATES.length} templates defined`,
            },
            { label: 'Registered users', value: String(userCount) },
          ],
        },
        {
          title: 'Import pipeline',
          metrics: [
            { label: 'Pending review', value: String(importStats.importPending) },
            { label: 'Approved', value: String(importStats.importApproved) },
            { label: 'Published items', value: String(importStats.importPublished) },
            { label: 'Live catalog cards', value: String(importStats.liveCatalogCards) },
            { label: 'Batches', value: String(batchCount) },
          ],
        },
        {
          title: 'Merchant IQ',
          metrics: [
            {
              label: 'Category coverage',
              value: `${coverage.mappingQuality.categoryCoveragePct}%`,
              hint: `${coverage.withCategory}/${coverage.totalActive} merchants`,
            },
            {
              label: 'Alias coverage',
              value: `${coverage.mappingQuality.aliasCoveragePct}%`,
              hint: `Avg ${coverage.avgAliasesPerMerchant.toFixed(1)} aliases`,
            },
            {
              label: 'Website coverage',
              value: `${coverage.mappingQuality.websiteCoveragePct}%`,
            },
            {
              label: 'MCC mappings',
              value: String(coverage.globalMccMappings),
            },
          ],
        },
      ],
    };
  }

  getRuleTemplates() {
    return { templates: RULE_TEMPLATES };
  }

  async getCatalogStats() {
    const stats = await this.catalogImport.getStats();
    const batchCount = await this.prisma.catalogImportBatch.count();
    return {
      stats: [
        { label: 'Pending import items', value: stats.importPending },
        { label: 'Approved items', value: stats.importApproved },
        { label: 'Published items', value: stats.importPublished },
        { label: 'Live cards', value: stats.liveCatalogCards },
        { label: 'Import batches', value: batchCount },
      ],
    };
  }
}
