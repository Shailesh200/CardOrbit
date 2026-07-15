import { Injectable } from '@nestjs/common';
import {
  OfferStatus,
  OfferType,
  type Offer,
  type OfferCardAssignment,
  type OfferMerchant,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import type {
  AssignCardInput,
  AssignMerchantInput,
  CreateOfferInput,
  OfferCardAssignmentEntity,
  OfferEntity,
  OfferMerchantEntity,
  UpdateOfferInput,
} from '../domain/entities/offer';
import type { OfferRepository } from '../domain/repositories/offer.repository';

function mapOffer(row: Offer): OfferEntity {
  return {
    id: row.id,
    code: row.code,
    slug: row.slug,
    title: row.title,
    description: row.description,
    type: row.type,
    issuerBankId: row.issuerBankId,
    cashbackPercent: row.cashbackPercent?.toString() ?? null,
    capInr: row.capInr?.toString() ?? null,
    termsSummary: row.termsSummary,
    terms: row.terms,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    status: row.status,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapCardAssignment(row: OfferCardAssignment): OfferCardAssignmentEntity {
  return {
    id: row.id,
    offerId: row.offerId,
    creditCardId: row.creditCardId,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapMerchant(row: OfferMerchant): OfferMerchantEntity {
  return {
    id: row.id,
    offerId: row.offerId,
    merchantId: row.merchantId,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function toOfferType(value: CreateOfferInput['type']): OfferType {
  return OfferType[value];
}

function toOfferStatus(value: NonNullable<CreateOfferInput['status']>): OfferStatus {
  return OfferStatus[value];
}

@Injectable()
export class PrismaOfferRepository implements OfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOfferInput): Promise<OfferEntity> {
    if (input.validUntil && input.validUntil < input.validFrom) {
      throw new Error('validUntil must be greater than or equal to validFrom');
    }

    const row = await this.prisma.offer.create({
      data: {
        id: newUuidV7(),
        code: input.code,
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        type: toOfferType(input.type),
        issuerBankId: input.issuerBankId ?? null,
        cashbackPercent: input.cashbackPercent ?? null,
        capInr: input.capInr ?? null,
        termsSummary: input.termsSummary ?? null,
        terms: (input.terms ?? undefined) as Prisma.InputJsonValue | undefined,
        validFrom: input.validFrom,
        validUntil: input.validUntil ?? null,
        status: input.status ? toOfferStatus(input.status) : OfferStatus.ACTIVE,
      },
    });
    return mapOffer(row);
  }

  async assignCard(input: AssignCardInput): Promise<OfferCardAssignmentEntity> {
    const row = await this.prisma.offerCardAssignment.create({
      data: {
        id: newUuidV7(),
        offerId: input.offerId,
        creditCardId: input.creditCardId,
      },
    });
    return mapCardAssignment(row);
  }

  async assignMerchant(input: AssignMerchantInput): Promise<OfferMerchantEntity> {
    const row = await this.prisma.offerMerchant.create({
      data: {
        id: newUuidV7(),
        offerId: input.offerId,
        merchantId: input.merchantId,
      },
    });
    return mapMerchant(row);
  }

  async findById(
    id: string,
    options: { includeHistorical?: boolean; includeDeleted?: boolean } = {},
  ): Promise<OfferEntity | null> {
    const statusFilter = options.includeHistorical
      ? undefined
      : {
          status: {
            in: [OfferStatus.ACTIVE, OfferStatus.SCHEDULED],
          },
        };

    const row = await this.prisma.offer.findFirst({
      where: {
        id,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...statusFilter,
      },
    });
    return row ? mapOffer(row) : null;
  }

  async findByCode(
    code: string,
    options: { includeHistorical?: boolean; includeDeleted?: boolean } = {},
  ): Promise<OfferEntity | null> {
    const statusFilter = options.includeHistorical
      ? undefined
      : {
          status: {
            in: [OfferStatus.ACTIVE, OfferStatus.SCHEDULED],
          },
        };

    const row = await this.prisma.offer.findFirst({
      where: {
        code,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
        ...statusFilter,
      },
    });
    return row ? mapOffer(row) : null;
  }

  async update(id: string, input: UpdateOfferInput): Promise<OfferEntity> {
    if (input.validFrom && input.validUntil && input.validUntil < input.validFrom) {
      throw new Error('validUntil must be greater than or equal to validFrom');
    }

    const row = await this.prisma.offer.update({
      where: { id },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.type !== undefined ? { type: toOfferType(input.type) } : {}),
        ...(input.issuerBankId !== undefined ? { issuerBankId: input.issuerBankId } : {}),
        ...(input.cashbackPercent !== undefined ? { cashbackPercent: input.cashbackPercent } : {}),
        ...(input.capInr !== undefined ? { capInr: input.capInr } : {}),
        ...(input.termsSummary !== undefined ? { termsSummary: input.termsSummary } : {}),
        ...(input.terms !== undefined ? { terms: input.terms as Prisma.InputJsonValue } : {}),
        ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}),
        ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
        ...(input.status !== undefined ? { status: toOfferStatus(input.status) } : {}),
        version: { increment: 1 },
      },
    });
    return mapOffer(row);
  }

  async listActiveAsOf(asOf: Date): Promise<OfferEntity[]> {
    const rows = await this.prisma.offer.findMany({
      where: {
        deletedAt: null,
        status: { in: [OfferStatus.ACTIVE, OfferStatus.SCHEDULED] },
        validFrom: { lte: asOf },
        OR: [{ validUntil: null }, { validUntil: { gte: asOf } }],
      },
      orderBy: { title: 'asc' },
    });
    return rows.map(mapOffer);
  }

  async expireOffer(id: string): Promise<OfferEntity> {
    const row = await this.prisma.offer.update({
      where: { id },
      data: {
        status: OfferStatus.EXPIRED,
        version: { increment: 1 },
      },
    });
    return mapOffer(row);
  }

  async markHistorical(id: string): Promise<OfferEntity> {
    const row = await this.prisma.offer.update({
      where: { id },
      data: {
        status: OfferStatus.HISTORICAL,
        version: { increment: 1 },
      },
    });
    return mapOffer(row);
  }
}
