import { Injectable } from '@nestjs/common';
import { parseRewardRulePayload, type RewardRulePayload } from '@cardwise/validation';
import {
  RewardRuleVersionStatus,
  type Prisma,
  type RewardRule,
  type RewardRuleVersion,
} from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../../infrastructure/prisma/uuid';
import type {
  ActiveRewardRuleView,
  CreateRewardRuleInput,
  CreateRewardRuleVersionInput,
  RewardRuleEntity,
  RewardRuleVersionEntity,
} from '../domain/entities/reward-rule';
import type { RewardRuleRepository } from '../domain/repositories/reward-rule.repository';

function mapRule(row: RewardRule): RewardRuleEntity {
  return {
    id: row.id,
    ruleKey: row.ruleKey,
    name: row.name,
    creditCardId: row.creditCardId,
    rewardProgramId: row.rewardProgramId,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapVersion(row: RewardRuleVersion): RewardRuleVersionEntity {
  return {
    id: row.id,
    ruleId: row.ruleId,
    versionNumber: row.versionNumber,
    status: row.status,
    spendCategoryId: row.spendCategoryId,
    merchantId: row.merchantId,
    payload: row.payload as RewardRulePayload,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    activatedAt: row.activatedAt,
    deactivatedAt: row.deactivatedAt,
    version: row.version,
    deletedAt: row.deletedAt,
  };
}

function mapActiveView(
  row: RewardRuleVersion & {
    rule: RewardRule & { rewardProgram: { pointValueInr: Prisma.Decimal | null } | null };
    spendCategory: { code: string } | null;
  },
): ActiveRewardRuleView {
  return {
    rule: mapRule(row.rule),
    activeVersion: mapVersion(row),
    pointValueInr: row.rule.rewardProgram?.pointValueInr
      ? Number(row.rule.rewardProgram.pointValueInr)
      : null,
    spendCategoryCode: row.spendCategory?.code ?? null,
  };
}

@Injectable()
export class PrismaRewardRuleRepository implements RewardRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(input: CreateRewardRuleInput): Promise<RewardRuleEntity> {
    const row = await this.prisma.rewardRule.create({
      data: {
        id: newUuidV7(),
        ruleKey: input.ruleKey,
        name: input.name,
        creditCardId: input.creditCardId,
        rewardProgramId: input.rewardProgramId ?? null,
      },
    });
    return mapRule(row);
  }

  async createVersion(input: CreateRewardRuleVersionInput): Promise<RewardRuleVersionEntity> {
    const payload = parseRewardRulePayload(input.payload);
    const status = input.status ?? RewardRuleVersionStatus.DRAFT;

    const row = await this.prisma.rewardRuleVersion.create({
      data: {
        id: newUuidV7(),
        ruleId: input.ruleId,
        versionNumber: input.versionNumber,
        status,
        spendCategoryId: input.spendCategoryId ?? null,
        merchantId: input.merchantId ?? null,
        payload: payload as Prisma.InputJsonValue,
        validFrom: input.validFrom ?? null,
        validUntil: input.validUntil ?? null,
        activatedAt: status === RewardRuleVersionStatus.ACTIVE ? new Date() : null,
      },
    });
    return mapVersion(row);
  }

  async findRuleByKey(
    ruleKey: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<RewardRuleEntity | null> {
    const row = await this.prisma.rewardRule.findFirst({
      where: {
        ruleKey,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
    });
    return row ? mapRule(row) : null;
  }

  async listActive(): Promise<ActiveRewardRuleView[]> {
    const rows = await this.prisma.rewardRuleVersion.findMany({
      where: {
        status: RewardRuleVersionStatus.ACTIVE,
        deletedAt: null,
        rule: { deletedAt: null },
      },
      include: {
        rule: { include: { rewardProgram: true } },
        spendCategory: true,
      },
      orderBy: [{ rule: { ruleKey: 'asc' } }, { versionNumber: 'desc' }],
    });

    return rows.map(mapActiveView);
  }

  async listActiveForCard(creditCardId: string): Promise<ActiveRewardRuleView[]> {
    const rows = await this.prisma.rewardRuleVersion.findMany({
      where: {
        status: RewardRuleVersionStatus.ACTIVE,
        deletedAt: null,
        rule: { deletedAt: null, creditCardId },
      },
      include: {
        rule: { include: { rewardProgram: true } },
        spendCategory: true,
      },
      orderBy: [{ versionNumber: 'desc' }],
    });

    return rows.map(mapActiveView);
  }

  async listVersionHistory(ruleKey: string): Promise<RewardRuleVersionEntity[]> {
    const rule = await this.prisma.rewardRule.findFirst({
      where: { ruleKey, deletedAt: null },
    });
    if (!rule) {
      return [];
    }

    const rows = await this.prisma.rewardRuleVersion.findMany({
      where: { ruleId: rule.id, deletedAt: null },
      orderBy: { versionNumber: 'asc' },
    });
    return rows.map(mapVersion);
  }

  async activateVersion(versionId: string): Promise<RewardRuleVersionEntity> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.rewardRuleVersion.findFirstOrThrow({
        where: { id: versionId, deletedAt: null },
      });

      await tx.rewardRuleVersion.updateMany({
        where: {
          ruleId: target.ruleId,
          status: RewardRuleVersionStatus.ACTIVE,
          deletedAt: null,
          id: { not: versionId },
        },
        data: {
          status: RewardRuleVersionStatus.INACTIVE,
          deactivatedAt: new Date(),
          version: { increment: 1 },
        },
      });

      const activated = await tx.rewardRuleVersion.update({
        where: { id: versionId },
        data: {
          status: RewardRuleVersionStatus.ACTIVE,
          activatedAt: new Date(),
          deactivatedAt: null,
          version: { increment: 1 },
        },
      });

      return mapVersion(activated);
    });
  }

  async deactivateVersion(versionId: string): Promise<RewardRuleVersionEntity> {
    const row = await this.prisma.rewardRuleVersion.update({
      where: { id: versionId },
      data: {
        status: RewardRuleVersionStatus.INACTIVE,
        deactivatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    return mapVersion(row);
  }
}
