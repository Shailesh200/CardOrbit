import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { crawlBankCards, INDIA_BANK_SOURCES, isSupportedBankSlug } from '@cardwise/catalog-ingest';
import {
  parseIngestMerchantRemove,
  parseIngestMerchantUpsert,
  extractIngestCardBundle,
  parseRewardRulePayload,
  type IngestCardBundle,
} from '@cardwise/validation';
import {
  CatalogImportEntityType,
  CatalogImportReviewStatus,
  CardFeeType,
  RewardRuleVersionStatus,
  type CardTier,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';
import { AdminAuditService } from '../admin-auth/admin-audit.service';
import type { AdminPrincipal } from '../admin-auth/admin-auth.types';
import { ActivateRewardRuleVersionCommand } from '../rewards/application/commands/activate-rule-version.command';

const CARD_NETWORKS = [
  { code: 'VISA', name: 'Visa', slug: 'visa' },
  { code: 'MASTERCARD', name: 'Mastercard', slug: 'mastercard' },
  { code: 'RUPAY', name: 'RuPay', slug: 'rupay' },
  { code: 'AMEX', name: 'American Express', slug: 'amex' },
] as const;

const BENEFIT_TYPES = [
  { code: 'FEES', name: 'Fees & charges', slug: 'fees' },
  { code: 'REWARDS', name: 'Rewards', slug: 'rewards' },
  { code: 'LOUNGE', name: 'Lounge access', slug: 'lounge' },
  { code: 'INSURANCE', name: 'Insurance', slug: 'insurance' },
  { code: 'FUEL', name: 'Fuel benefits', slug: 'fuel' },
  { code: 'DINING', name: 'Dining', slug: 'dining' },
  { code: 'TRAVEL', name: 'Travel', slug: 'travel' },
  { code: 'SHOPPING', name: 'Shopping', slug: 'shopping' },
  { code: 'WELCOME', name: 'Welcome offer', slug: 'welcome' },
  { code: 'CASHBACK', name: 'Cashback', slug: 'cashback' },
  { code: 'ENTERTAINMENT', name: 'Entertainment', slug: 'entertainment' },
  { code: 'EMI', name: 'EMI & interest', slug: 'emi' },
  { code: 'APPROVAL', name: 'How to apply', slug: 'approval' },
  { code: 'ELIGIBILITY', name: 'Eligibility', slug: 'eligibility' },
];

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value.includes('T') ? value : `${value}T00:00:00.000Z`);
}

function parseStructuredFeeAmount(value: string): number | null {
  const lower = value.toLowerCase();
  if (/\bnil\b|\bzero\b|\blifetime free\b|\bno annual fee\b/.test(lower)) return 0;
  const match = value.match(/₹\s*([\d,]+(?:\.\d+)?)/);
  if (match?.[1]) return Number(match[1].replace(/,/g, ''));
  return null;
}

function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type CatalogImportItemDto = {
  id: string;
  batchId: string;
  entityType: CatalogImportEntityType;
  entityKey: string;
  sourceUrl: string | null;
  payload: unknown;
  summary: string | null;
  reviewStatus: CatalogImportReviewStatus;
  reviewedAt: string | null;
  reviewNotes: string | null;
  publishedAt: string | null;
  publishedEntityId: string | null;
  createdAt: string;
};

@Injectable()
export class CatalogImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly activateRuleVersion: ActivateRewardRuleVersionCommand,
  ) {}

  private toDto(row: {
    id: string;
    batchId: string;
    entityType: CatalogImportEntityType;
    entityKey: string;
    sourceUrl: string | null;
    payload: unknown;
    summary: string | null;
    reviewStatus: CatalogImportReviewStatus;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    publishedAt: Date | null;
    publishedEntityId: string | null;
    createdAt: Date;
  }): CatalogImportItemDto {
    return {
      id: row.id,
      batchId: row.batchId,
      entityType: row.entityType,
      entityKey: row.entityKey,
      sourceUrl: row.sourceUrl,
      payload: row.payload,
      summary: row.summary,
      reviewStatus: row.reviewStatus,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewNotes: row.reviewNotes,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      publishedEntityId: row.publishedEntityId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async crawlBankCatalogBatch(
    bankSlug: string,
  ): Promise<{ batchId: string; itemCount: number; bankSlug: string }> {
    if (!isSupportedBankSlug(bankSlug)) {
      throw new BadRequestException(`Unsupported bank for crawl: ${bankSlug}`);
    }

    const payloads = await crawlBankCards(bankSlug);
    if (!payloads.length) {
      throw new BadRequestException(`No cards crawled for bank: ${bankSlug}`);
    }

    const batchId = newUuidV7();

    await this.prisma.catalogImportBatch.create({
      data: {
        id: batchId,
        label: `${bankSlug} crawl ${new Date().toISOString().slice(0, 10)}`,
        source: `bank-crawl:${bankSlug}`,
        metadata: {
          market: 'IN',
          bankSlug,
          crawledAt: new Date().toISOString(),
        },
      },
    });

    const chunkSize = 50;
    const now = new Date();
    for (let offset = 0; offset < payloads.length; offset += chunkSize) {
      const chunk = payloads.slice(offset, offset + chunkSize);
      await this.prisma.catalogImportItem.createMany({
        data: chunk.map((item) => ({
          id: newUuidV7(),
          batchId,
          entityType: item.entityType as CatalogImportEntityType,
          entityKey: item.entityKey,
          sourceUrl: item.sourceUrl,
          payload: item.payload as Prisma.InputJsonValue,
          summary: item.summary,
          updatedAt: now,
        })),
      });
    }

    return { batchId, itemCount: payloads.length, bankSlug };
  }

  async listItems(query: {
    status?: CatalogImportReviewStatus;
    entityType?: CatalogImportEntityType;
    limit?: number;
    offset?: number;
  }): Promise<{ items: CatalogImportItemDto[]; total: number }> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);
    const where = {
      ...(query.status ? { reviewStatus: query.status } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.catalogImportItem.findMany({
        where,
        orderBy: [{ reviewStatus: 'asc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.catalogImportItem.count({ where }),
    ]);

    return { items: rows.map((row) => this.toDto(row)), total };
  }

  async getItem(id: string): Promise<CatalogImportItemDto> {
    const row = await this.prisma.catalogImportItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Import item not found');
    return this.toDto(row);
  }

  async approveItem(
    id: string,
    admin: AdminPrincipal,
    notes?: string,
  ): Promise<CatalogImportItemDto> {
    const row = await this.requireReviewable(id);
    if (row.reviewStatus !== CatalogImportReviewStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending items can be approved');
    }

    const updated = await this.prisma.catalogImportItem.update({
      where: { id },
      data: {
        reviewStatus: CatalogImportReviewStatus.APPROVED,
        reviewedByAdminId: admin.id,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
      },
    });

    await this.audit.record(admin, 'catalog_import.approve', 'catalog_import_item', id, {
      entityKey: row.entityKey,
    });

    return this.toDto(updated);
  }

  async rejectItem(
    id: string,
    admin: AdminPrincipal,
    notes?: string,
  ): Promise<CatalogImportItemDto> {
    const row = await this.requireReviewable(id);
    if (row.reviewStatus !== CatalogImportReviewStatus.PENDING_REVIEW) {
      throw new BadRequestException('Only pending items can be rejected');
    }

    const updated = await this.prisma.catalogImportItem.update({
      where: { id },
      data: {
        reviewStatus: CatalogImportReviewStatus.REJECTED,
        reviewedByAdminId: admin.id,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
      },
    });

    await this.audit.record(admin, 'catalog_import.reject', 'catalog_import_item', id, {
      entityKey: row.entityKey,
    });

    return this.toDto(updated);
  }

  async publishItem(id: string, admin: AdminPrincipal): Promise<CatalogImportItemDto> {
    const row = await this.requireReviewable(id);
    if (row.reviewStatus !== CatalogImportReviewStatus.APPROVED) {
      throw new BadRequestException('Only approved items can be published');
    }

    let publishedEntityId: string;

    switch (row.entityType) {
      case CatalogImportEntityType.CARD_BUNDLE:
        publishedEntityId = await this.publishCardBundle(extractIngestCardBundle(row.payload));
        break;
      case CatalogImportEntityType.MERCHANT_UPSERT:
        publishedEntityId = await this.publishMerchantUpsert(
          parseIngestMerchantUpsert(row.payload),
        );
        break;
      case CatalogImportEntityType.MERCHANT_REMOVE:
        publishedEntityId = await this.publishMerchantRemove(
          parseIngestMerchantRemove(row.payload),
        );
        break;
      default:
        throw new BadRequestException('Unsupported entity type');
    }

    const updated = await this.prisma.catalogImportItem.update({
      where: { id },
      data: {
        reviewStatus: CatalogImportReviewStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedEntityId,
      },
    });

    await this.audit.record(admin, 'catalog_import.publish', 'catalog_import_item', id, {
      entityKey: row.entityKey,
      publishedEntityId,
    });

    return this.toDto(updated);
  }

  async publishApprovedBatch(
    admin: AdminPrincipal,
    batchId: string,
  ): Promise<{ published: number }> {
    const items = await this.prisma.catalogImportItem.findMany({
      where: { batchId, reviewStatus: CatalogImportReviewStatus.APPROVED },
      orderBy: { entityType: 'asc' },
    });

    let published = 0;
    for (const item of items) {
      await this.publishItem(item.id, admin);
      published += 1;
    }

    return { published };
  }

  async approveAllPending(
    admin: AdminPrincipal,
    entityType?: CatalogImportEntityType,
  ): Promise<{ approved: number }> {
    const items = await this.prisma.catalogImportItem.findMany({
      where: {
        reviewStatus: CatalogImportReviewStatus.PENDING_REVIEW,
        ...(entityType ? { entityType } : {}),
      },
      select: { id: true },
    });

    let approved = 0;
    for (const item of items) {
      await this.approveItem(item.id, admin);
      approved += 1;
    }

    return { approved };
  }

  async publishAllApproved(
    admin: AdminPrincipal,
    entityType?: CatalogImportEntityType,
  ): Promise<{ published: number }> {
    const items = await this.prisma.catalogImportItem.findMany({
      where: {
        reviewStatus: CatalogImportReviewStatus.APPROVED,
        ...(entityType ? { entityType } : {}),
      },
      orderBy: [{ entityType: 'asc' }, { createdAt: 'asc' }],
    });

    let published = 0;
    for (const item of items) {
      await this.publishItem(item.id, admin);
      published += 1;
    }

    return { published };
  }

  async getStats(): Promise<{
    liveCatalogCards: number;
    importPending: number;
    importApproved: number;
    importPublished: number;
  }> {
    const [liveCatalogCards, importPending, importApproved, importPublished] = await Promise.all([
      this.prisma.creditCard.count({
        where: { deletedAt: null, active: true, slug: { not: { startsWith: 'm018-' } } },
      }),
      this.prisma.catalogImportItem.count({
        where: { reviewStatus: CatalogImportReviewStatus.PENDING_REVIEW },
      }),
      this.prisma.catalogImportItem.count({
        where: { reviewStatus: CatalogImportReviewStatus.APPROVED },
      }),
      this.prisma.catalogImportItem.count({
        where: { reviewStatus: CatalogImportReviewStatus.PUBLISHED },
      }),
    ]);

    return { liveCatalogCards, importPending, importApproved, importPublished };
  }

  private async requireReviewable(id: string) {
    const row = await this.prisma.catalogImportItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Import item not found');
    if (row.reviewStatus === CatalogImportReviewStatus.PUBLISHED) {
      throw new BadRequestException('Item is already published');
    }
    if (row.reviewStatus === CatalogImportReviewStatus.REJECTED) {
      throw new BadRequestException('Rejected items cannot be published');
    }
    return row;
  }

  private async ensureBenefitTypes(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const def of BENEFIT_TYPES) {
      const existing = await this.prisma.benefitType.findFirst({ where: { code: def.code } });
      if (existing) {
        map.set(def.code, existing.id);
        continue;
      }
      const created = await this.prisma.benefitType.create({
        data: { id: newUuidV7(), code: def.code, name: def.name, slug: def.slug },
      });
      map.set(def.code, created.id);
    }
    return map;
  }

  private async ensureBankForBundle(bundle: IngestCardBundle) {
    const sourceUrl = bundle.bankSourceUrl ?? null;
    const existing = await this.prisma.bank.findFirst({
      where: { slug: bundle.bankSlug },
    });

    if (existing) {
      if (existing.deletedAt) {
        return this.prisma.bank.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            ...(sourceUrl ? { sourceUrl } : {}),
            version: { increment: 1 },
          },
        });
      }
      if (sourceUrl && existing.sourceUrl !== sourceUrl) {
        return this.prisma.bank.update({
          where: { id: existing.id },
          data: { sourceUrl, version: { increment: 1 } },
        });
      }
      return existing;
    }

    const catalogSource = INDIA_BANK_SOURCES.find((entry) => entry.slug === bundle.bankSlug);
    if (!catalogSource) {
      throw new BadRequestException(
        `Bank not found: ${bundle.bankSlug}. Create the bank in catalog or add it to supported issuers.`,
      );
    }

    return this.prisma.bank.create({
      data: {
        id: newUuidV7(),
        name: catalogSource.name,
        slug: catalogSource.slug,
        country: 'IN',
        sourceUrl: sourceUrl ?? catalogSource.catalogUrl,
      },
    });
  }

  private async ensureCardNetwork(code: string) {
    const existing = await this.prisma.cardNetwork.findFirst({
      where: { code },
    });

    if (existing) {
      if (existing.deletedAt) {
        return this.prisma.cardNetwork.update({
          where: { id: existing.id },
          data: { deletedAt: null, version: { increment: 1 } },
        });
      }
      return existing;
    }

    const definition = CARD_NETWORKS.find((entry) => entry.code === code);
    if (!definition) {
      throw new BadRequestException(`Network not found: ${code}`);
    }

    return this.prisma.cardNetwork.create({
      data: {
        id: newUuidV7(),
        code: definition.code,
        name: definition.name,
        slug: definition.slug,
      },
    });
  }

  private async publishCardBundle(bundle: IngestCardBundle): Promise<string> {
    const benefitTypeIds = await this.ensureBenefitTypes();

    const bank = await this.ensureBankForBundle(bundle);
    const network = await this.ensureCardNetwork(bundle.networkCode);

    let programId: string | null = null;
    if (bundle.rewardProgramSlug) {
      const programSlug = bundle.rewardProgramSlug;
      const existingProgram = await this.prisma.rewardProgram.findFirst({
        where: { slug: programSlug },
      });
      if (existingProgram) {
        programId = existingProgram.id;
        await this.prisma.rewardProgram.update({
          where: { id: existingProgram.id },
          data: {
            issuerBankId: bank.id,
            pointValueInr: bundle.pointValueInr ?? undefined,
            deletedAt: null,
            version: { increment: 1 },
          },
        });
      } else {
        const created = await this.prisma.rewardProgram.create({
          data: {
            id: newUuidV7(),
            name: `${bank.name} Rewards`,
            slug: programSlug,
            issuerBankId: bank.id,
            pointValueInr: bundle.pointValueInr ?? null,
          },
        });
        programId = created.id;
      }
    }

    const existingCard = await this.prisma.creditCard.findFirst({ where: { slug: bundle.slug } });
    let cardId: string;

    if (existingCard) {
      cardId = existingCard.id;
      await this.prisma.creditCard.update({
        where: { id: cardId },
        data: {
          name: bundle.name,
          bankId: bank.id,
          networkId: network.id,
          rewardProgramId: programId,
          tier: bundle.tier as CardTier,
          active: true,
          annualFeeInr: bundle.annualFeeInr ?? null,
          joiningFeeInr: bundle.joiningFeeInr ?? null,
          sourceUrl: bundle.sourceUrl,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
    } else {
      cardId = newUuidV7();
      await this.prisma.creditCard.create({
        data: {
          id: cardId,
          name: bundle.name,
          slug: bundle.slug,
          bankId: bank.id,
          networkId: network.id,
          rewardProgramId: programId,
          tier: bundle.tier as CardTier,
          active: true,
          annualFeeInr: bundle.annualFeeInr ?? null,
          joiningFeeInr: bundle.joiningFeeInr ?? null,
          sourceUrl: bundle.sourceUrl,
        },
      });
    }

    await this.prisma.cardBenefit.updateMany({
      where: { creditCardId: cardId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    for (const benefit of bundle.benefits) {
      const typeId = benefitTypeIds.get(benefit.benefitTypeCode);
      if (!typeId) continue;
      await this.prisma.cardBenefit.create({
        data: {
          id: newUuidV7(),
          creditCardId: cardId,
          benefitTypeId: typeId,
          title: benefit.title,
          description: benefit.description ?? null,
          sourceUrl: benefit.sourceUrl ?? bundle.sourceUrl,
        },
      });
    }

    await this.prisma.cardFee.updateMany({
      where: { creditCardId: cardId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    const feeRows: Array<{ feeType: CardFeeType; amountInr: number }> = [];
    if (bundle.joiningFeeInr != null) {
      feeRows.push({ feeType: CardFeeType.JOINING, amountInr: bundle.joiningFeeInr });
    }
    if (bundle.annualFeeInr != null) {
      feeRows.push({ feeType: CardFeeType.ANNUAL, amountInr: bundle.annualFeeInr });
    }

    for (const fee of bundle.structuredFees) {
      if (fee.feeKind !== 'JOINING' && fee.feeKind !== 'ANNUAL') continue;
      const amount = parseStructuredFeeAmount(fee.value);
      if (amount == null) continue;
      feeRows.push({
        feeType: fee.feeKind === 'JOINING' ? CardFeeType.JOINING : CardFeeType.ANNUAL,
        amountInr: amount,
      });
    }

    const uniqueFees = new Map<CardFeeType, number>();
    for (const row of feeRows) {
      uniqueFees.set(row.feeType, row.amountInr);
    }

    for (const [feeType, amountInr] of uniqueFees) {
      await this.prisma.cardFee.create({
        data: {
          id: newUuidV7(),
          creditCardId: cardId,
          feeType,
          amountInr,
        },
      });
    }

    const spendCategories = await this.prisma.spendCategory.findMany({
      where: { deletedAt: null },
    });
    const spendByCode = new Map(spendCategories.map((row) => [row.code, row.id]));

    const merchants = await this.prisma.merchant.findMany({
      where: { deletedAt: null },
      select: { id: true, slug: true },
    });
    const merchantBySlug = new Map(merchants.map((row) => [row.slug, row.id]));

    for (const rule of bundle.rewardRules) {
      const payload = parseRewardRulePayload(rule.payload);
      const existingRule = await this.prisma.rewardRule.findFirst({
        where: { ruleKey: rule.ruleKey },
      });

      let ruleId: string;
      if (existingRule) {
        ruleId = existingRule.id;
        await this.prisma.rewardRule.update({
          where: { id: ruleId },
          data: {
            name: rule.name,
            creditCardId: cardId,
            rewardProgramId: programId,
            deletedAt: null,
            version: { increment: 1 },
          },
        });
      } else {
        ruleId = newUuidV7();
        await this.prisma.rewardRule.create({
          data: {
            id: ruleId,
            ruleKey: rule.ruleKey,
            name: rule.name,
            creditCardId: cardId,
            rewardProgramId: programId,
          },
        });
      }

      const versionNumber = (await this.prisma.rewardRuleVersion.count({ where: { ruleId } })) + 1;

      const version = await this.prisma.rewardRuleVersion.create({
        data: {
          id: newUuidV7(),
          ruleId,
          versionNumber,
          status: RewardRuleVersionStatus.DRAFT,
          spendCategoryId: rule.spendCategoryCode
            ? (spendByCode.get(rule.spendCategoryCode) ?? null)
            : null,
          merchantId: rule.merchantSlug ? (merchantBySlug.get(rule.merchantSlug) ?? null) : null,
          payload: payload as Prisma.InputJsonValue,
          validFrom: parseDate(rule.validFrom),
          validUntil: parseDate(rule.validUntil ?? null),
          sourceUrl: rule.sourceUrl ?? bundle.sourceUrl,
        },
      });

      await this.activateRuleVersion.execute(version.id);
    }

    return cardId;
  }

  private async publishMerchantUpsert(
    payload: ReturnType<typeof parseIngestMerchantUpsert>,
  ): Promise<string> {
    const category = payload.primaryCategoryCode
      ? await this.prisma.merchantCategory.findFirst({
          where: { code: payload.primaryCategoryCode, deletedAt: null },
        })
      : null;

    const existing = await this.prisma.merchant.findFirst({ where: { slug: payload.slug } });
    let merchantId: string;

    if (existing) {
      merchantId = existing.id;
      await this.prisma.merchant.update({
        where: { id: merchantId },
        data: {
          name: payload.name,
          website: payload.website ?? null,
          sourceUrl: payload.sourceUrl ?? payload.website ?? null,
          brandName: payload.brandName ?? payload.name,
          parentBrand: payload.parentBrand ?? null,
          popularityScore: payload.popularityScore ?? existing.popularityScore,
          tags: payload.tags,
          primaryCategoryId: category?.id ?? existing.primaryCategoryId,
          active: payload.active,
          deletedAt: null,
          version: { increment: 1 },
        },
      });
    } else {
      merchantId = newUuidV7();
      await this.prisma.merchant.create({
        data: {
          id: merchantId,
          name: payload.name,
          slug: payload.slug,
          website: payload.website ?? null,
          sourceUrl: payload.sourceUrl ?? payload.website ?? null,
          brandName: payload.brandName ?? payload.name,
          parentBrand: payload.parentBrand ?? null,
          popularityScore: payload.popularityScore ?? 50,
          tags: payload.tags,
          primaryCategoryId: category?.id ?? null,
          active: payload.active,
        },
      });
    }

    for (const alias of payload.aliases) {
      const normalized = normalizeAlias(alias);
      await this.prisma.merchantAlias.upsert({
        where: {
          merchantId_normalizedAlias: { merchantId, normalizedAlias: normalized },
        },
        create: {
          id: newUuidV7(),
          merchantId,
          alias,
          normalizedAlias: normalized,
        },
        update: { alias, deletedAt: null, version: { increment: 1 } },
      });
    }

    return merchantId;
  }

  private async publishMerchantRemove(
    payload: ReturnType<typeof parseIngestMerchantRemove>,
  ): Promise<string> {
    const merchant = await this.prisma.merchant.findFirst({
      where: { slug: payload.slug, deletedAt: null },
    });
    if (!merchant) throw new NotFoundException(`Merchant not found: ${payload.slug}`);

    await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: { active: false, deletedAt: new Date(), version: { increment: 1 } },
    });

    return merchant.id;
  }
}
