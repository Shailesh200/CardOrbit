import { createHash } from 'node:crypto';

import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { assignExperimentVariants, type ExperimentDefinitionValue } from '@cardwise/feature-flags';
import {
  DEFAULT_EXPERIMENT_DEFINITIONS,
  type ExperimentDefinitionDto,
  type ExperimentsSnapshot,
} from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';

const REFRESH_MS = 30_000;

@Injectable()
export class ExperimentsService implements OnModuleInit {
  private readonly logger = new Logger(ExperimentsService.name);
  private version = 'bootstrap';
  private refreshedAt = 0;
  private definitions: ExperimentDefinitionValue[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedMissingDefinitions();
    await this.refreshDefinitions();
  }

  async getAssignmentsSnapshot(distinctId: string): Promise<ExperimentsSnapshot> {
    await this.ensureFresh();
    return {
      version: this.version,
      distinctId,
      fetchedAt: new Date().toISOString(),
      assignments: assignExperimentVariants(this.definitions, distinctId),
    };
  }

  async listDefinitions(): Promise<ExperimentDefinitionDto[]> {
    await this.ensureFresh();
    const rows = await this.prisma.experimentDefinition.findMany({
      orderBy: { key: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async updateDefinition(
    key: string,
    input: {
      enabled?: boolean;
      rolloutPercentage?: number;
      description?: string | null;
      name?: string;
    },
    updatedBy?: string,
  ): Promise<ExperimentDefinitionDto> {
    const existing = await this.prisma.experimentDefinition.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Experiment not found: ${key}`);
    }

    const row = await this.prisma.experimentDefinition.update({
      where: { key },
      data: {
        enabled: input.enabled ?? existing.enabled,
        rolloutPercentage: input.rolloutPercentage ?? existing.rolloutPercentage,
        description: input.description === undefined ? existing.description : input.description,
        name: input.name ?? existing.name,
        updatedBy: updatedBy ?? existing.updatedBy,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: updatedBy ?? null,
        action: 'experiment.update',
        resource: 'experiment',
        resourceId: row.id,
        metadata: {
          key: row.key,
          enabled: row.enabled,
          rolloutPercentage: row.rolloutPercentage,
        },
      },
    });

    await this.refreshDefinitions();
    return this.toDto(row);
  }

  private async ensureFresh(): Promise<void> {
    if (Date.now() - this.refreshedAt < REFRESH_MS) return;
    await this.refreshDefinitions();
  }

  private async refreshDefinitions(): Promise<void> {
    const rows = await this.prisma.experimentDefinition.findMany();
    this.definitions = rows.map((row) => ({
      key: row.key,
      variants: this.parseVariants(row.variants),
      defaultVariant: row.defaultVariant,
      enabled: row.enabled,
      rolloutPercentage: row.rolloutPercentage,
    }));
    this.version = createHash('sha1')
      .update(
        rows
          .map(
            (row) =>
              `${row.key}:${row.updatedAt.toISOString()}:${row.enabled}:${row.rolloutPercentage}`,
          )
          .join('|'),
      )
      .digest('hex')
      .slice(0, 12);
    this.refreshedAt = Date.now();
  }

  private async seedMissingDefinitions(): Promise<void> {
    for (const seed of DEFAULT_EXPERIMENT_DEFINITIONS) {
      const existing = await this.prisma.experimentDefinition.findUnique({
        where: { key: seed.key },
      });
      if (existing) continue;

      await this.prisma.experimentDefinition.create({
        data: {
          id: newUuidV7(),
          key: seed.key,
          name: seed.name,
          description: seed.description,
          variants: [...seed.variants],
          defaultVariant: seed.defaultVariant,
          enabled: seed.enabled,
          rolloutPercentage: seed.rolloutPercentage,
        },
      });
    }
    this.logger.log(`Seeded ${DEFAULT_EXPERIMENT_DEFINITIONS.length} experiment definitions`);
  }

  private parseVariants(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  private toDto(row: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    variants: unknown;
    defaultVariant: string;
    enabled: boolean;
    rolloutPercentage: number;
    updatedBy: string | null;
    updatedAt: Date;
  }): ExperimentDefinitionDto {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      variants: this.parseVariants(row.variants),
      defaultVariant: row.defaultVariant,
      enabled: row.enabled,
      rolloutPercentage: row.rolloutPercentage,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
