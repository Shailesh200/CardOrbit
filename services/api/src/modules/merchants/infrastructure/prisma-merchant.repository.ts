import { Injectable } from '@nestjs/common';
import type { MccMapping, Merchant, MerchantAlias, MerchantCategory, Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import type {
  CreateMccMappingInput,
  CreateMerchantAliasInput,
  CreateMerchantCategoryInput,
  CreateMerchantInput,
  MccMappingEntity,
  MerchantAliasEntity,
  MerchantCategoryEntity,
  MerchantEntity,
  UpdateMerchantInput,
} from '../domain/entities/merchant-catalog';
import type {
  MccMappingRepository,
  MerchantAliasRepository,
  MerchantCategoryRepository,
  MerchantRepository,
} from '../domain/repositories/merchant-catalog.repository';

function mapCategory(row: MerchantCategory): MerchantCategoryEntity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
    description: row.description,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapMerchant(row: Merchant): MerchantEntity {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl,
    primaryCategoryId: row.primaryCategoryId,
    paymentMethods: row.paymentMethods,
    active: row.active,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapAlias(row: MerchantAlias): MerchantAliasEntity {
  return {
    id: row.id,
    merchantId: row.merchantId,
    alias: row.alias,
    normalizedAlias: row.normalizedAlias,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapMcc(row: MccMapping): MccMappingEntity {
  return {
    id: row.id,
    mccCode: row.mccCode,
    categoryId: row.categoryId,
    merchantId: row.merchantId,
    description: row.description,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

export function normalizeAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

@Injectable()
export class PrismaMerchantCategoryRepository implements MerchantCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMerchantCategoryInput): Promise<MerchantCategoryEntity> {
    const row = await this.prisma.merchantCategory.create({
      data: {
        id: newUuidV7(),
        code: input.code,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      },
    });
    return mapCategory(row);
  }

  async listActive(): Promise<MerchantCategoryEntity[]> {
    const rows = await this.prisma.merchantCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapCategory);
  }
}

@Injectable()
export class PrismaMerchantRepository implements MerchantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMerchantInput): Promise<MerchantEntity> {
    const row = await this.prisma.merchant.create({
      data: {
        id: newUuidV7(),
        name: input.name,
        slug: input.slug,
        logoUrl: input.logoUrl ?? null,
        primaryCategoryId: input.primaryCategoryId ?? null,
        paymentMethods: (input.paymentMethods ?? ['CARD']) as Prisma.InputJsonValue,
        active: input.active ?? true,
      },
    });
    return mapMerchant(row);
  }

  async findById(
    id: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<MerchantEntity | null> {
    const row = await this.prisma.merchant.findFirst({
      where: {
        id,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
    });
    return row ? mapMerchant(row) : null;
  }

  async findBySlug(
    slug: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<MerchantEntity | null> {
    const row = await this.prisma.merchant.findFirst({
      where: {
        slug,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
    });
    return row ? mapMerchant(row) : null;
  }

  async listActive(): Promise<MerchantEntity[]> {
    const rows = await this.prisma.merchant.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapMerchant);
  }

  async update(id: string, input: UpdateMerchantInput): Promise<MerchantEntity> {
    const row = await this.prisma.merchant.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.primaryCategoryId !== undefined
          ? { primaryCategoryId: input.primaryCategoryId }
          : {}),
        ...(input.paymentMethods !== undefined
          ? { paymentMethods: input.paymentMethods as Prisma.InputJsonValue }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        version: { increment: 1 },
      },
    });
    return mapMerchant(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.merchant.update({
      where: { id },
      data: { deletedAt: new Date(), active: false, version: { increment: 1 } },
    });
  }

  async searchByName(query: string): Promise<MerchantEntity[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const matches = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM merchants.merchants
      WHERE deleted_at IS NULL
        AND active = true
        AND to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(slug, ''))
            @@ plainto_tsquery('simple', ${trimmed})
      ORDER BY name ASC
    `;

    if (matches.length === 0) {
      return [];
    }

    const rows = await this.prisma.merchant.findMany({
      where: { id: { in: matches.map((m) => m.id) } },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapMerchant);
  }
}

@Injectable()
export class PrismaMerchantAliasRepository implements MerchantAliasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMerchantAliasInput): Promise<MerchantAliasEntity> {
    const normalized = input.normalizedAlias ?? normalizeAlias(input.alias);
    const row = await this.prisma.merchantAlias.create({
      data: {
        id: newUuidV7(),
        merchantId: input.merchantId,
        alias: input.alias,
        normalizedAlias: normalized,
      },
    });
    return mapAlias(row);
  }

  async findByAlias(alias: string): Promise<MerchantAliasEntity | null> {
    const row = await this.prisma.merchantAlias.findFirst({
      where: {
        normalizedAlias: normalizeAlias(alias),
        deletedAt: null,
      },
    });
    return row ? mapAlias(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.merchantAlias.update({
      where: { id },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  }
}

@Injectable()
export class PrismaMccMappingRepository implements MccMappingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMccMappingInput): Promise<MccMappingEntity> {
    const row = await this.prisma.mccMapping.create({
      data: {
        id: newUuidV7(),
        mccCode: input.mccCode,
        categoryId: input.categoryId,
        merchantId: input.merchantId ?? null,
        description: input.description ?? null,
      },
    });
    return mapMcc(row);
  }

  async findByMccCode(
    mccCode: string,
    options: { merchantId?: string | null } = {},
  ): Promise<MccMappingEntity | null> {
    if (options.merchantId) {
      const override = await this.prisma.mccMapping.findFirst({
        where: {
          mccCode,
          merchantId: options.merchantId,
          deletedAt: null,
        },
      });
      if (override) {
        return mapMcc(override);
      }
    }

    const global = await this.prisma.mccMapping.findFirst({
      where: {
        mccCode,
        merchantId: null,
        deletedAt: null,
      },
    });
    return global ? mapMcc(global) : null;
  }
}
