import { createHash } from 'node:crypto';

import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  FEATURE_FLAG_DEFAULTS,
  getAllFlags,
  type FeatureFlagKey,
  initFeatureFlags,
  isEnabled,
  isFeatureFlagKey,
  applyFeatureFlagDefinitions,
} from '@cardwise/feature-flags';
import type { FeatureFlagDefinitionDto, FeatureFlagsSnapshot } from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';

const REFRESH_MS = 30_000;

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private version = 'bootstrap';
  private refreshedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    initFeatureFlags({ useLocalOnly: true });
    await this.seedMissingDefinitions();
    await this.alignUneditedDefaults();
    await this.refreshDefinitions();
  }

  async isEnabled(flag: FeatureFlagKey, distinctId = 'anonymous'): Promise<boolean> {
    await this.ensureFresh();
    return isEnabled(flag, distinctId);
  }

  async getEvaluatedSnapshot(distinctId: string): Promise<FeatureFlagsSnapshot> {
    await this.ensureFresh();
    const flags = await getAllFlags(distinctId);
    return {
      version: this.version,
      distinctId,
      fetchedAt: new Date().toISOString(),
      flags,
    };
  }

  async listDefinitions(): Promise<FeatureFlagDefinitionDto[]> {
    await this.ensureFresh();
    const rows = await this.prisma.featureFlagDefinition.findMany({
      orderBy: { key: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async updateDefinition(
    key: string,
    input: { enabled?: boolean; rolloutPercentage?: number; description?: string | null },
    updatedBy?: string,
  ): Promise<FeatureFlagDefinitionDto> {
    if (!isFeatureFlagKey(key)) {
      throw new NotFoundException(`Unknown feature flag: ${key}`);
    }

    const existing = await this.prisma.featureFlagDefinition.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Feature flag not found: ${key}`);
    }

    const row = await this.prisma.featureFlagDefinition.update({
      where: { key },
      data: {
        enabled: input.enabled ?? existing.enabled,
        rolloutPercentage: input.rolloutPercentage ?? existing.rolloutPercentage,
        description: input.description === undefined ? existing.description : input.description,
        updatedBy: updatedBy ?? existing.updatedBy,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: updatedBy ?? null,
        action: 'feature_flag.update',
        resource: 'feature_flag',
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
    const rows = await this.prisma.featureFlagDefinition.findMany();
    applyFeatureFlagDefinitions(rows);
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
    const keys = Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[];
    for (const key of keys) {
      const existing = await this.prisma.featureFlagDefinition.findUnique({ where: { key } });
      if (existing) continue;

      const defaultEnabled = FEATURE_FLAG_DEFAULTS[key];
      await this.prisma.featureFlagDefinition.create({
        data: {
          id: newUuidV7(),
          key,
          description: null,
          enabled: defaultEnabled,
          rolloutPercentage: defaultEnabled ? 100 : 0,
        },
      });
    }
    this.logger.log(`Seeded ${keys.length} feature flag definitions`);
  }

  /**
   * Promote flags whose package defaults flipped on, but only when an admin never
   * edited the row (updatedBy is null). Preserves intentional admin disables.
   */
  private async alignUneditedDefaults(): Promise<void> {
    const keys = (Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[]).filter(
      (key) => FEATURE_FLAG_DEFAULTS[key],
    );
    let updated = 0;
    for (const key of keys) {
      const result = await this.prisma.featureFlagDefinition.updateMany({
        where: {
          key,
          enabled: false,
          updatedBy: null,
        },
        data: {
          enabled: true,
          rolloutPercentage: 100,
        },
      });
      updated += result.count;
    }
    if (updated > 0) {
      this.logger.log(`Aligned ${updated} unedited feature flags to package defaults`);
    }
  }

  private toDto(row: {
    id: string;
    key: string;
    description: string | null;
    enabled: boolean;
    rolloutPercentage: number;
    updatedBy: string | null;
    updatedAt: Date;
  }): FeatureFlagDefinitionDto {
    return {
      id: row.id,
      key: row.key,
      description: row.description,
      enabled: row.enabled,
      rolloutPercentage: row.rolloutPercentage,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
