import { generateObject, generateText } from 'ai';
import type { AiFeature } from '@cardwise/validation';
import type { z } from 'zod';

import { createLanguageModel } from './providers';
import { loadAiConfig } from './config';
import { geminiGeneratePlainText, geminiGenerateStructured } from './gemini/generate';
import { buildAiRunLog, emitAiRun } from './run-logger';

export type StructuredResult<T> = {
  data: T;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
};

export type ModelTier = 'fast' | 'quality' | 'ping';

function resolveModel(tier: ModelTier, override?: string): string {
  if (override?.trim()) return override.trim();
  const config = loadAiConfig();
  if (tier === 'ping') return config.pingModel;
  return tier === 'quality' ? config.qualityModel : config.fastModel;
}

export function resolveModelId(options: { tier: ModelTier; override?: string | null }): string {
  return resolveModel(options.tier, options.override ?? undefined);
}

export async function generateStructured<T extends z.ZodTypeAny>(options: {
  schema: T;
  system: string;
  prompt: string;
  tier?: ModelTier;
  maxOutputTokens?: number;
  temperature?: number;
  feature?: AiFeature;
  promptVersion?: string;
  modelOverride?: string | null;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}): Promise<StructuredResult<z.infer<T>>> {
  const config = loadAiConfig();
  const modelId = resolveModel(options.tier ?? 'fast', options.modelOverride ?? undefined);
  const started = Date.now();
  const feature = options.feature ?? 'ping';
  const promptVersion = options.promptVersion;

  try {
    let data: z.infer<T>;
    let usage: StructuredResult<z.infer<T>>['usage'];

    if (config.provider === 'gemini') {
      const result = await geminiGenerateStructured({
        schema: options.schema,
        system: options.system,
        prompt: options.prompt,
        model: modelId,
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature,
      });
      data = result.data;
      usage = {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
      };
    } else {
      const result = await generateObject({
        model: createLanguageModel(config, modelId),
        schema: options.schema,
        system: options.system,
        prompt: options.prompt,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        maxOutputTokens: options.maxOutputTokens ?? 4096,
      });
      data = result.object as z.infer<T>;
      usage = {
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        totalTokens: result.usage?.totalTokens,
      };
    }

    const latencyMs = Date.now() - started;
    await emitAiRun(
      buildAiRunLog({
        feature,
        promptVersion,
        model: modelId,
        provider: config.provider,
        tier: options.tier ?? 'fast',
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        totalTokens: usage?.totalTokens,
        latencyMs,
        success: true,
        metadata: options.metadata,
        triggeredBy: options.triggeredBy,
      }),
    );

    return { data, model: modelId, usage, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - started;
    await emitAiRun(
      buildAiRunLog({
        feature,
        promptVersion,
        model: modelId,
        provider: config.provider,
        tier: options.tier ?? 'fast',
        latencyMs,
        success: false,
        error,
        metadata: options.metadata,
        triggeredBy: options.triggeredBy,
      }),
    );
    throw error;
  }
}

export async function generatePlainText(options: {
  system?: string;
  prompt: string;
  tier?: ModelTier;
  maxOutputTokens?: number;
  temperature?: number;
  feature?: AiFeature;
  promptVersion?: string;
  modelOverride?: string | null;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ text: string; model: string; latencyMs: number; usage?: StructuredResult<unknown>['usage'] }> {
  const config = loadAiConfig();
  const modelId = resolveModel(options.tier ?? 'fast', options.modelOverride ?? undefined);
  const started = Date.now();
  const feature = options.feature ?? 'ping';

  try {
    let text: string;
    let usage: StructuredResult<unknown>['usage'];

    if (config.provider === 'gemini') {
      const result = await geminiGeneratePlainText({
        system: options.system,
        prompt: options.prompt,
        model: modelId,
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature,
      });
      text = result.text;
      usage = {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
      };
    } else {
      const result = await generateText({
        model: createLanguageModel(config, modelId),
        system: options.system,
        prompt: options.prompt,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        maxOutputTokens: options.maxOutputTokens ?? 256,
      });
      text = result.text.trim();
      usage = {
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        totalTokens: result.usage?.totalTokens,
      };
    }

    const latencyMs = Date.now() - started;
    await emitAiRun(
      buildAiRunLog({
        feature,
        promptVersion: options.promptVersion,
        model: modelId,
        provider: config.provider,
        tier: options.tier ?? 'fast',
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        totalTokens: usage?.totalTokens,
        latencyMs,
        success: true,
        metadata: options.metadata,
        triggeredBy: options.triggeredBy,
      }),
    );

    return { text, model: modelId, latencyMs, usage };
  } catch (error) {
    const latencyMs = Date.now() - started;
    await emitAiRun(
      buildAiRunLog({
        feature,
        promptVersion: options.promptVersion,
        model: modelId,
        provider: config.provider,
        tier: options.tier ?? 'fast',
        latencyMs,
        success: false,
        error,
        metadata: options.metadata,
        triggeredBy: options.triggeredBy,
      }),
    );
    throw error;
  }
}
