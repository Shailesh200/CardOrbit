import { Injectable } from '@nestjs/common';
import { CardTier, type Bank, type CardNetwork, type CreditCard } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import type {
  BankEntity,
  CardNetworkEntity,
  CreateBankInput,
  CreateCardNetworkInput,
  CreateCreditCardInput,
  CreditCardEntity,
  UpdateCreditCardInput,
} from '../domain/entities/card-catalog';
import type {
  BankRepository,
  CardNetworkRepository,
  CreditCardRepository,
} from '../domain/repositories/card-catalog.repository';

function mapBank(row: Bank): BankEntity {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    logoUrl: row.logoUrl,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapNetwork(row: CardNetwork): CardNetworkEntity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapCard(row: CreditCard): CreditCardEntity {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bankId: row.bankId,
    networkId: row.networkId,
    rewardProgramId: row.rewardProgramId,
    tier: row.tier,
    active: row.active,
    annualFeeInr: row.annualFeeInr?.toString() ?? null,
    joiningFeeInr: row.joiningFeeInr?.toString() ?? null,
    version: row.version,
    deletedAt: row.deletedAt,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
  };
}

@Injectable()
export class PrismaBankRepository implements BankRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateBankInput): Promise<BankEntity> {
    const row = await this.prisma.bank.create({
      data: {
        id: newUuidV7(),
        name: input.name,
        slug: input.slug,
        country: input.country ?? 'IN',
        logoUrl: input.logoUrl ?? null,
      },
    });
    return mapBank(row);
  }

  async findBySlug(
    slug: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<BankEntity | null> {
    const row = await this.prisma.bank.findFirst({
      where: {
        slug,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
    });
    return row ? mapBank(row) : null;
  }

  async listActive(): Promise<BankEntity[]> {
    const rows = await this.prisma.bank.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapBank);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.bank.update({
      where: { id },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  }
}

@Injectable()
export class PrismaCardNetworkRepository implements CardNetworkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCardNetworkInput): Promise<CardNetworkEntity> {
    const row = await this.prisma.cardNetwork.create({
      data: {
        id: newUuidV7(),
        code: input.code,
        name: input.name,
        slug: input.slug,
      },
    });
    return mapNetwork(row);
  }

  async findByCode(code: string): Promise<CardNetworkEntity | null> {
    const row = await this.prisma.cardNetwork.findFirst({
      where: { code, deletedAt: null },
    });
    return row ? mapNetwork(row) : null;
  }

  async listActive(): Promise<CardNetworkEntity[]> {
    const rows = await this.prisma.cardNetwork.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapNetwork);
  }
}

@Injectable()
export class PrismaCreditCardRepository implements CreditCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCreditCardInput): Promise<CreditCardEntity> {
    const tier =
      input.tier && Object.values(CardTier).includes(input.tier as CardTier)
        ? (input.tier as CardTier)
        : CardTier.STANDARD;

    const row = await this.prisma.creditCard.create({
      data: {
        id: newUuidV7(),
        name: input.name,
        slug: input.slug,
        bankId: input.bankId,
        networkId: input.networkId,
        rewardProgramId: input.rewardProgramId ?? null,
        tier,
        active: input.active ?? true,
        annualFeeInr: input.annualFeeInr ?? null,
        joiningFeeInr: input.joiningFeeInr ?? null,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
      },
    });
    return mapCard(row);
  }

  async findById(
    id: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<CreditCardEntity | null> {
    const row = await this.prisma.creditCard.findFirst({
      where: {
        id,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
    });
    return row ? mapCard(row) : null;
  }

  async findBySlug(
    slug: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<CreditCardEntity | null> {
    const row = await this.prisma.creditCard.findFirst({
      where: {
        slug,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
    });
    return row ? mapCard(row) : null;
  }

  async listActive(): Promise<CreditCardEntity[]> {
    const rows = await this.prisma.creditCard.findMany({
      where: { deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapCard);
  }

  async update(id: string, input: UpdateCreditCardInput): Promise<CreditCardEntity> {
    const tier =
      input.tier !== undefined
        ? Object.values(CardTier).includes(input.tier as CardTier)
          ? (input.tier as CardTier)
          : undefined
        : undefined;

    const row = await this.prisma.creditCard.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.bankId !== undefined ? { bankId: input.bankId } : {}),
        ...(input.networkId !== undefined ? { networkId: input.networkId } : {}),
        ...(input.rewardProgramId !== undefined ? { rewardProgramId: input.rewardProgramId } : {}),
        ...(tier !== undefined ? { tier } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.annualFeeInr !== undefined ? { annualFeeInr: input.annualFeeInr } : {}),
        ...(input.joiningFeeInr !== undefined ? { joiningFeeInr: input.joiningFeeInr } : {}),
        ...(input.effectiveFrom !== undefined ? { effectiveFrom: input.effectiveFrom } : {}),
        ...(input.effectiveTo !== undefined ? { effectiveTo: input.effectiveTo } : {}),
        version: { increment: 1 },
      },
    });
    return mapCard(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.creditCard.update({
      where: { id },
      data: { deletedAt: new Date(), active: false, version: { increment: 1 } },
    });
  }
}
