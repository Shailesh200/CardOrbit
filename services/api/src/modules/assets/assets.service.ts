import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CardTier } from '@prisma/client';
import {
  parseAdminCreateBankInput,
  parseAdminCreateCreditCardInput,
  parseAdminCreateMerchantInput,
  parseAdminUpdateBankInput,
  parseAdminUpdateCreditCardInput,
  parseAdminUpdateMerchantInput,
  parseListAdminAssetsQuery,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { rethrowPrismaUnique } from '../../infrastructure/prisma/prisma-errors';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';

export type AssetEntityType = 'bank' | 'merchant' | 'credit-card';

export type AssetRow = {
  id: string;
  entityType: AssetEntityType;
  name: string;
  slug: string;
  logoUrl: string | null;
  imageUrl: string | null;
  active: boolean;
  country?: string;
  bankId?: string;
  networkId?: string;
  annualFeeInr?: string | null;
};

export type NetworkOption = {
  id: string;
  name: string;
  slug: string;
  code: string;
};

export type BrandRegistry = {
  banks: Record<string, string | null>;
  merchants: Record<string, string | null>;
  creditCards: Record<string, string | null>;
};

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdminAssetsPaginated(rawQuery: unknown): Promise<{
    tab: 'banks' | 'merchants' | 'credit-cards';
    items: AssetRow[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    summary: {
      totalBanks: number;
      totalMerchants: number;
      totalCreditCards: number;
      missingAssets: number;
    };
    options: {
      banks: Array<{ id: string; name: string; slug: string }>;
      networks: NetworkOption[];
    };
  }> {
    let query;
    try {
      query = parseListAdminAssetsQuery(rawQuery);
    } catch {
      throw new BadRequestException('Invalid assets query');
    }

    const skip = (query.page - 1) * query.limit;
    const search = query.q?.trim();

    const [summary, options, pageResult] = await Promise.all([
      this.loadSummary(),
      this.loadOptions(),
      this.loadTabPage(query.tab, skip, query.limit, search),
    ]);

    return {
      tab: query.tab,
      items: pageResult.items,
      page: query.page,
      limit: query.limit,
      total: pageResult.total,
      totalPages: Math.max(1, Math.ceil(pageResult.total / query.limit)),
      summary,
      options,
    };
  }

  private async loadSummary() {
    const [
      totalBanks,
      totalMerchants,
      totalCreditCards,
      missingBank,
      missingMerchant,
      missingCard,
    ] = await Promise.all([
      this.prisma.bank.count({ where: { deletedAt: null } }),
      this.prisma.merchant.count({ where: { deletedAt: null } }),
      this.prisma.creditCard.count({ where: { deletedAt: null } }),
      this.prisma.bank.count({ where: { deletedAt: null, logoUrl: null } }),
      this.prisma.merchant.count({ where: { deletedAt: null, logoUrl: null } }),
      this.prisma.creditCard.count({ where: { deletedAt: null, imageUrl: null } }),
    ]);

    return {
      totalBanks,
      totalMerchants,
      totalCreditCards,
      missingAssets: missingBank + missingMerchant + missingCard,
    };
  }

  private async loadOptions() {
    const [banks, networks] = await Promise.all([
      this.prisma.bank.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.cardNetwork.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, code: true },
      }),
    ]);

    return { banks, networks };
  }

  private async loadTabPage(
    tab: 'banks' | 'merchants' | 'credit-cards',
    skip: number,
    take: number,
    search?: string,
  ): Promise<{ items: AssetRow[]; total: number }> {
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    if (tab === 'banks') {
      const where = { deletedAt: null, ...searchFilter };
      const [rows, total] = await Promise.all([
        this.prisma.bank.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take,
          select: { id: true, name: true, slug: true, logoUrl: true, country: true },
        }),
        this.prisma.bank.count({ where }),
      ]);
      return {
        total,
        items: rows.map((row) => this.mapBank(row)),
      };
    }

    if (tab === 'merchants') {
      const where = { deletedAt: null, ...searchFilter };
      const [rows, total] = await Promise.all([
        this.prisma.merchant.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take,
          select: { id: true, name: true, slug: true, logoUrl: true, active: true },
        }),
        this.prisma.merchant.count({ where }),
      ]);
      return {
        total,
        items: rows.map((row) => this.mapMerchant(row)),
      };
    }

    const where = { deletedAt: null, ...searchFilter };
    const [rows, total] = await Promise.all([
      this.prisma.creditCard.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          active: true,
          bankId: true,
          networkId: true,
          annualFeeInr: true,
        },
      }),
      this.prisma.creditCard.count({ where }),
    ]);

    return {
      total,
      items: rows.map((row) => this.mapCreditCard(row)),
    };
  }

  /** @deprecated Use listAdminAssetsPaginated */
  async listAdminAssets(): Promise<{
    banks: AssetRow[];
    merchants: AssetRow[];
    creditCards: AssetRow[];
    networks: NetworkOption[];
    summary: { total: number; missingLogo: number };
  }> {
    const [banks, merchants, creditCards, networks] = await Promise.all([
      this.prisma.bank.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, logoUrl: true, country: true },
      }),
      this.prisma.merchant.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, logoUrl: true, active: true },
      }),
      this.prisma.creditCard.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          active: true,
          bankId: true,
          networkId: true,
          annualFeeInr: true,
        },
      }),
      this.prisma.cardNetwork.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, code: true },
      }),
    ]);

    const rows: AssetRow[] = [
      ...banks.map((row) => ({
        id: row.id,
        entityType: 'bank' as const,
        name: row.name,
        slug: row.slug,
        logoUrl: row.logoUrl,
        imageUrl: null,
        active: true,
        country: row.country,
      })),
      ...merchants.map((row) => ({
        id: row.id,
        entityType: 'merchant' as const,
        name: row.name,
        slug: row.slug,
        logoUrl: row.logoUrl,
        imageUrl: null,
        active: row.active,
      })),
      ...creditCards.map((row) => ({
        id: row.id,
        entityType: 'credit-card' as const,
        name: row.name,
        slug: row.slug,
        logoUrl: null,
        imageUrl: row.imageUrl,
        active: row.active,
        bankId: row.bankId,
        networkId: row.networkId,
        annualFeeInr: row.annualFeeInr?.toString() ?? null,
      })),
    ];

    const missingLogo = rows.filter((row) =>
      row.entityType === 'credit-card' ? !row.imageUrl : !row.logoUrl,
    ).length;

    return {
      banks: rows.filter((row) => row.entityType === 'bank'),
      merchants: rows.filter((row) => row.entityType === 'merchant'),
      creditCards: rows.filter((row) => row.entityType === 'credit-card'),
      networks,
      summary: { total: rows.length, missingLogo },
    };
  }

  async getBrandRegistry(): Promise<BrandRegistry> {
    const [banks, merchants, creditCards] = await Promise.all([
      this.prisma.bank.findMany({
        where: { deletedAt: null },
        select: { slug: true, logoUrl: true },
      }),
      this.prisma.merchant.findMany({
        where: { deletedAt: null, active: true },
        select: { slug: true, logoUrl: true },
      }),
      this.prisma.creditCard.findMany({
        where: { deletedAt: null, active: true },
        select: { slug: true, imageUrl: true },
      }),
    ]);

    return {
      banks: Object.fromEntries(banks.map((row) => [row.slug, row.logoUrl])),
      merchants: Object.fromEntries(merchants.map((row) => [row.slug, row.logoUrl])),
      creditCards: Object.fromEntries(creditCards.map((row) => [row.slug, row.imageUrl])),
    };
  }

  async createBank(raw: unknown): Promise<AssetRow> {
    let input;
    try {
      input = parseAdminCreateBankInput(raw);
    } catch {
      throw new BadRequestException('Invalid bank payload');
    }

    await this.assertBankSlugAvailable(input.slug);

    try {
      const row = await this.prisma.bank.create({
        data: {
          id: newUuidV7(),
          name: input.name,
          slug: input.slug,
          country: input.country ?? 'IN',
          logoUrl: input.logoUrl ?? null,
        },
      });

      return this.mapBank(row);
    } catch (error) {
      rethrowPrismaUnique(error, 'Bank');
    }
  }

  async updateBank(id: string, raw: unknown): Promise<AssetRow> {
    let input;
    try {
      input = parseAdminUpdateBankInput(raw);
    } catch {
      throw new BadRequestException('Invalid bank payload');
    }

    const existing = await this.prisma.bank.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Bank not found');

    if (input.slug) {
      await this.assertBankSlugAvailable(input.slug, id);
    }

    try {
      const row = await this.prisma.bank.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
          version: { increment: 1 },
        },
      });

      return this.mapBank(row);
    } catch (error) {
      rethrowPrismaUnique(error, 'Bank');
    }
  }

  async archiveBank(id: string): Promise<{ id: string; archived: true }> {
    const existing = await this.prisma.bank.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Bank not found');

    await this.prisma.bank.update({
      where: { id },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });

    return { id, archived: true };
  }

  async createMerchant(raw: unknown): Promise<AssetRow> {
    let input;
    try {
      input = parseAdminCreateMerchantInput(raw);
    } catch {
      throw new BadRequestException('Invalid merchant payload');
    }

    await this.assertMerchantSlugAvailable(input.slug);

    try {
      const row = await this.prisma.merchant.create({
        data: {
          id: newUuidV7(),
          name: input.name,
          slug: input.slug,
          logoUrl: input.logoUrl ?? null,
          active: input.active ?? true,
        },
      });

      return this.mapMerchant(row);
    } catch (error) {
      rethrowPrismaUnique(error, 'Merchant');
    }
  }

  async updateMerchant(id: string, raw: unknown): Promise<AssetRow> {
    let input;
    try {
      input = parseAdminUpdateMerchantInput(raw);
    } catch {
      throw new BadRequestException('Invalid merchant payload');
    }

    const existing = await this.prisma.merchant.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Merchant not found');

    if (input.slug) {
      await this.assertMerchantSlugAvailable(input.slug, id);
    }

    try {
      const row = await this.prisma.merchant.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
          version: { increment: 1 },
        },
      });

      return this.mapMerchant(row);
    } catch (error) {
      rethrowPrismaUnique(error, 'Merchant');
    }
  }

  async archiveMerchant(id: string): Promise<{ id: string; archived: true }> {
    const existing = await this.prisma.merchant.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Merchant not found');

    await this.prisma.merchant.update({
      where: { id },
      data: { deletedAt: new Date(), active: false, version: { increment: 1 } },
    });

    return { id, archived: true };
  }

  async createCreditCard(raw: unknown): Promise<AssetRow> {
    let input;
    try {
      input = parseAdminCreateCreditCardInput(raw);
    } catch {
      throw new BadRequestException('Invalid credit card payload');
    }

    await this.assertCreditCardSlugAvailable(input.slug);

    try {
      const row = await this.prisma.creditCard.create({
        data: {
          id: newUuidV7(),
          name: input.name,
          slug: input.slug,
          bankId: input.bankId,
          networkId: input.networkId,
          imageUrl: input.imageUrl ?? null,
          annualFeeInr: input.annualFeeInr ?? null,
          active: input.active ?? true,
          tier: CardTier.STANDARD,
        },
      });

      return this.mapCreditCard(row);
    } catch (error) {
      rethrowPrismaUnique(error, 'Credit card');
    }
  }

  async updateCreditCard(id: string, raw: unknown): Promise<AssetRow> {
    let input;
    try {
      input = parseAdminUpdateCreditCardInput(raw);
    } catch {
      throw new BadRequestException('Invalid credit card payload');
    }

    const existing = await this.prisma.creditCard.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Credit card not found');

    if (input.slug) {
      await this.assertCreditCardSlugAvailable(input.slug, id);
    }

    try {
      const row = await this.prisma.creditCard.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.bankId !== undefined ? { bankId: input.bankId } : {}),
          ...(input.networkId !== undefined ? { networkId: input.networkId } : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.annualFeeInr !== undefined ? { annualFeeInr: input.annualFeeInr } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
          version: { increment: 1 },
        },
      });

      return this.mapCreditCard(row);
    } catch (error) {
      rethrowPrismaUnique(error, 'Credit card');
    }
  }

  async archiveCreditCard(id: string): Promise<{ id: string; archived: true }> {
    const existing = await this.prisma.creditCard.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Credit card not found');

    await this.prisma.creditCard.update({
      where: { id },
      data: { deletedAt: new Date(), active: false, version: { increment: 1 } },
    });

    return { id, archived: true };
  }

  private async assertBankSlugAvailable(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.bank.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Bank "${slug}" already exists. Edit the existing bank to update its logo instead of creating a duplicate.`,
      );
    }
  }

  private async assertMerchantSlugAvailable(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.merchant.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Merchant "${slug}" already exists. Edit the existing merchant instead of creating a duplicate.`,
      );
    }
  }

  private async assertCreditCardSlugAvailable(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.creditCard.findFirst({
      where: {
        slug,
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Credit card "${slug}" already exists. Edit the existing card instead of creating a duplicate.`,
      );
    }
  }

  private mapBank(row: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    country: string;
  }): AssetRow {
    return {
      id: row.id,
      entityType: 'bank',
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl,
      imageUrl: null,
      active: true,
      country: row.country,
    };
  }

  private mapMerchant(row: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    active: boolean;
  }): AssetRow {
    return {
      id: row.id,
      entityType: 'merchant',
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl,
      imageUrl: null,
      active: row.active,
    };
  }

  private mapCreditCard(row: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    active: boolean;
    bankId: string;
    networkId: string;
    annualFeeInr: { toString(): string } | null;
  }): AssetRow {
    return {
      id: row.id,
      entityType: 'credit-card',
      name: row.name,
      slug: row.slug,
      logoUrl: null,
      imageUrl: row.imageUrl,
      active: row.active,
      bankId: row.bankId,
      networkId: row.networkId,
      annualFeeInr: row.annualFeeInr?.toString() ?? null,
    };
  }
}
