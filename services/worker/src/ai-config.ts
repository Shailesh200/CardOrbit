import type { PrismaClient } from '@prisma/client';
import { resolveModelId } from '@cardwise/ai';

import type { AiExecConfig } from '@cardwise/job-runners';

export async function resolveAiExecConfig(prisma: PrismaClient): Promise<AiExecConfig> {
  const active = await prisma.aiPromptVersion.findFirst({
    where: { feature: 'catalog-structure', isActive: true },
    orderBy: { version: 'desc' },
  });

  const modelTier = 'fast' as const;
  const modelOverride = active?.modelOverride ?? null;
  const effectiveModel = resolveModelId({ tier: modelTier, override: modelOverride });

  return {
    promptVersion: active ? String(active.version) : null,
    systemPrompt: active?.systemPrompt ?? '',
    modelTier,
    modelOverride,
    effectiveModel,
  };
}
