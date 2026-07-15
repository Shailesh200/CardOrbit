import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { AiRunStatus } from '@prisma/client';
import {
  AI_PROMPT_REGISTRY,
  isAiConfigured,
  loadAiConfig,
  pingAi,
  resolveModelId,
  setAiRunLogger,
  verifyGeminiApiKey,
  type ModelTier,
} from '@cardwise/ai';
import { FeatureFlag } from '@cardwise/feature-flags';
import type {
  AiFeature,
  AiRunLogInput,
  CreateAiPromptVersionInput,
  UpdateAiPromptVersionInput,
} from '@cardwise/validation';
import { AiFeatureSchema } from '@cardwise/validation';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { newUuidV7 } from '../../infrastructure/prisma/uuid';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

const AI_FEATURE_FLAGS = [
  FeatureFlag.AI_PLATFORM_ENABLED,
  FeatureFlag.AI_CATALOG_STRUCTURING_ENABLED,
  FeatureFlag.AI_EXPLANATIONS_ENABLED,
  FeatureFlag.AI_INSIGHTS_ENABLED,
  FeatureFlag.AI_SEARCH_ENABLED,
  FeatureFlag.AI_ASSISTANT_ENABLED,
  FeatureFlag.AI_COPILOT_ENABLED,
  FeatureFlag.AI_KNOWLEDGE_GRAPH_ENABLED,
  FeatureFlag.AI_RANKING_SIGNALS_ENABLED,
  FeatureFlag.AI_MERCHANT_ENRICHMENT_ENABLED,
  FeatureFlag.AI_OFFER_PARSING_ENABLED,
  FeatureFlag.AI_ADMIN_INSIGHTS_ENABLED,
] as const;

const DEFAULT_FEATURE_TIERS: Record<AiFeature, ModelTier> = {
  ping: 'ping',
  'catalog-structure': 'fast',
  'reco-explain': 'quality',
  'smart-insights': 'fast',
  'ranking-signals': 'fast',
  'merchant-enrichment': 'fast',
  'offer-parsing': 'fast',
  'admin-insights': 'fast',
  'semantic-search': 'fast',
  assistant: 'quality',
  'rag-answer': 'quality',
};

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async onModuleInit(): Promise<void> {
    setAiRunLogger((entry) => this.persistRun(entry));
    await this.seedPromptRegistry();
  }

  async getPlatformStatus() {
    const flags = await this.getAiFlags();
    const configured = isAiConfigured();

    if (!configured) {
      return {
        configured: false,
        platformEnabled: flags[FeatureFlag.AI_PLATFORM_ENABLED] ?? false,
        flags,
      };
    }

    const config = loadAiConfig();
    return {
      configured: true,
      provider: config.provider,
      defaultModel: config.defaultModel,
      fastModel: config.fastModel,
      qualityModel: config.qualityModel,
      pingModel: config.pingModel,
      platformEnabled: flags[FeatureFlag.AI_PLATFORM_ENABLED] ?? false,
      flags,
    };
  }

  async isPlatformEnabled(distinctId = 'anonymous'): Promise<boolean> {
    return this.featureFlags.isEnabled(FeatureFlag.AI_PLATFORM_ENABLED, distinctId);
  }

  async isFeatureEnabled(
    flag: (typeof AI_FEATURE_FLAGS)[number],
    distinctId = 'anonymous',
  ): Promise<boolean> {
    if (!(await this.isPlatformEnabled(distinctId))) return false;
    return this.featureFlags.isEnabled(flag, distinctId);
  }

  async ping(triggeredBy?: string) {
    if (!(await this.isPlatformEnabled())) {
      throw new BadRequestException('AI platform is disabled (ai_platform_enabled=false)');
    }
    if (!isAiConfigured()) {
      throw new BadRequestException('AI is not configured — set GEMINI_API_KEY in environment');
    }

    const routing = await this.resolveTaskRouting('ping');
    const keyCheck = await verifyGeminiApiKey();
    const result = await pingAi({ triggeredBy: triggeredBy ?? 'admin' });

    return {
      ok: true,
      model: result.model,
      latencyMs: result.latencyMs,
      text: result.text,
      verifiedModel: keyCheck.model,
      routing,
    };
  }

  async listRuns(options?: {
    feature?: string;
    status?: AiRunStatus;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(options?.limit ?? 50, 200);
    const offset = options?.offset ?? 0;
    const where = {
      ...(options?.feature ? { feature: options.feature } : {}),
      ...(options?.status ? { status: options.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.aiRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.aiRun.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async getRunSummary(options?: { days?: number }) {
    const days = options?.days ?? 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totals, byFeature, byStatus, recentFailures] = await Promise.all([
      this.prisma.aiRun.aggregate({
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          latencyMs: true,
        },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiRun.groupBy({
        by: ['feature'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { totalTokens: true },
      }),
      this.prisma.aiRun.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.aiRun.findMany({
        where: { createdAt: { gte: since }, status: AiRunStatus.FAILURE },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          feature: true,
          model: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
    ]);

    const successCount =
      byStatus.find((row) => row.status === AiRunStatus.SUCCESS)?._count._all ?? 0;
    const failureCount =
      byStatus.find((row) => row.status === AiRunStatus.FAILURE)?._count._all ?? 0;

    return {
      windowDays: days,
      since: since.toISOString(),
      totalRuns: totals._count._all,
      successCount,
      failureCount,
      tokens: {
        input: totals._sum.inputTokens ?? 0,
        output: totals._sum.outputTokens ?? 0,
        total: totals._sum.totalTokens ?? 0,
      },
      avgLatencyMs: Math.round(totals._avg.latencyMs ?? 0),
      byFeature: byFeature
        .map((row) => ({
          feature: row.feature,
          runs: row._count._all,
          totalTokens: row._sum.totalTokens ?? 0,
        }))
        .sort((a, b) => b.runs - a.runs),
      recentFailures,
    };
  }

  async getRun(id: string) {
    const run = await this.prisma.aiRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException(`AI run not found: ${id}`);
    return run;
  }

  async listPromptVersions(feature?: string) {
    return this.prisma.aiPromptVersion.findMany({
      where: feature ? { feature } : undefined,
      orderBy: [{ feature: 'asc' }, { version: 'desc' }],
    });
  }

  async getPromptVersion(id: string) {
    const prompt = await this.prisma.aiPromptVersion.findUnique({ where: { id } });
    if (!prompt) throw new NotFoundException(`Prompt version not found: ${id}`);
    return prompt;
  }

  async getActivePrompt(feature: string) {
    return this.prisma.aiPromptVersion.findFirst({
      where: { feature, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createPromptVersion(input: CreateAiPromptVersionInput, adminId?: string) {
    const existing = await this.prisma.aiPromptVersion.findUnique({
      where: {
        feature_version: { feature: input.feature, version: input.version },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Prompt version ${input.feature}@${input.version} already exists`,
      );
    }

    const created = await this.prisma.aiPromptVersion.create({
      data: {
        id: newUuidV7(),
        feature: input.feature,
        version: input.version,
        systemPrompt: input.systemPrompt,
        userTemplate: input.userTemplate,
        modelTier: input.modelTier,
        modelOverride: input.modelOverride,
        isActive: false,
        metadata: {
          createdByAdminId: adminId ?? null,
          source: 'admin',
        },
      },
    });

    if (input.activate) {
      return this.activatePromptVersion(created.id, adminId);
    }

    return created;
  }

  async updatePromptVersion(id: string, input: UpdateAiPromptVersionInput, adminId?: string) {
    const existing = await this.getPromptVersion(id);
    const priorMeta =
      typeof existing.metadata === 'object' && existing.metadata !== null
        ? (existing.metadata as Record<string, unknown>)
        : {};

    return this.prisma.aiPromptVersion.update({
      where: { id },
      data: {
        ...(input.systemPrompt !== undefined ? { systemPrompt: input.systemPrompt } : {}),
        ...(input.userTemplate !== undefined ? { userTemplate: input.userTemplate } : {}),
        ...(input.modelTier !== undefined ? { modelTier: input.modelTier } : {}),
        ...(input.modelOverride !== undefined ? { modelOverride: input.modelOverride } : {}),
        metadata: {
          ...priorMeta,
          updatedByAdminId: adminId ?? null,
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }

  async activatePromptVersion(id: string, adminId?: string) {
    const prompt = await this.getPromptVersion(id);

    await this.prisma.$transaction([
      this.prisma.aiPromptVersion.updateMany({
        where: { feature: prompt.feature, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.aiPromptVersion.update({
        where: { id },
        data: {
          isActive: true,
          metadata: {
            ...(typeof prompt.metadata === 'object' && prompt.metadata !== null
              ? (prompt.metadata as Record<string, unknown>)
              : {}),
            activatedByAdminId: adminId ?? null,
            activatedAt: new Date().toISOString(),
          },
        },
      }),
    ]);

    return this.getPromptVersion(id);
  }

  async getTaskRouting() {
    if (!isAiConfigured()) {
      return { configured: false, routes: [] as Array<Record<string, unknown>> };
    }

    const features = AiFeatureSchema.options;
    const routes = await Promise.all(features.map((feature) => this.resolveTaskRouting(feature)));

    return { configured: true, routes };
  }

  async resolveTaskRouting(feature: AiFeature) {
    const active = await this.getActivePrompt(feature);
    const tier = (active?.modelTier ?? DEFAULT_FEATURE_TIERS[feature]) as ModelTier;
    const envDefaultModel = resolveModelId({ tier });
    const effectiveModel = resolveModelId({
      tier,
      override: active?.modelOverride,
    });

    return {
      feature,
      activeVersion: active?.version ?? null,
      modelTier: tier,
      modelOverride: active?.modelOverride ?? null,
      envDefaultModel,
      effectiveModel,
    };
  }

  async getFeatureExecutionConfig(feature: AiFeature) {
    const active = await this.getActivePrompt(feature);
    const routing = await this.resolveTaskRouting(feature);
    const registry = AI_PROMPT_REGISTRY[feature as keyof typeof AI_PROMPT_REGISTRY];

    return {
      promptVersion: active?.version ?? registry?.version ?? null,
      systemPrompt: active?.systemPrompt ?? registry?.systemPrompt ?? '',
      modelTier: routing.modelTier as ModelTier,
      modelOverride: active?.modelOverride ?? routing.modelOverride,
      effectiveModel: routing.effectiveModel,
    };
  }

  private async getAiFlags(distinctId = 'anonymous'): Promise<Record<string, boolean>> {
    const snapshot = await this.featureFlags.getEvaluatedSnapshot(distinctId);
    return Object.fromEntries(
      AI_FEATURE_FLAGS.map((flag) => [flag, snapshot.flags[flag] ?? false]),
    );
  }

  private async persistRun(entry: AiRunLogInput): Promise<void> {
    try {
      await this.prisma.aiRun.create({
        data: {
          id: newUuidV7(),
          feature: entry.feature,
          promptVersion: entry.promptVersion,
          model: entry.model,
          provider: entry.provider,
          tier: entry.tier,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
          totalTokens: entry.totalTokens,
          latencyMs: entry.latencyMs,
          status: entry.status as AiRunStatus,
          errorCode: entry.errorCode,
          errorMessage: entry.errorMessage,
          metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
          triggeredBy: entry.triggeredBy,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to persist AiRun for ${entry.feature}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async seedPromptRegistry(): Promise<void> {
    for (const [feature, entry] of Object.entries(AI_PROMPT_REGISTRY)) {
      const existing = await this.prisma.aiPromptVersion.findUnique({
        where: {
          feature_version: { feature, version: entry.version },
        },
      });
      if (existing) continue;

      await this.prisma.aiPromptVersion.create({
        data: {
          id: newUuidV7(),
          feature,
          version: entry.version,
          systemPrompt: entry.systemPrompt,
          modelTier: entry.modelTier,
          isActive: true,
          metadata: { description: entry.description, seededBy: 'ai-001' },
        },
      });
    }
  }
}
