import type { AiFeature, AiRunLogInput } from '@cardwise/validation';

import type { ModelTier } from './structured';

export type AiRunLogger = (entry: AiRunLogInput) => void | Promise<void>;

let runLogger: AiRunLogger | null = null;

export function setAiRunLogger(logger: AiRunLogger | null): void {
  runLogger = logger;
}

export async function emitAiRun(entry: AiRunLogInput): Promise<void> {
  if (!runLogger) return;
  await runLogger(entry);
}

export function buildAiRunLog(options: {
  feature: AiFeature;
  promptVersion?: string;
  model: string;
  provider: string;
  tier?: ModelTier;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  success: boolean;
  error?: unknown;
  metadata?: Record<string, unknown>;
  triggeredBy?: string;
}): AiRunLogInput {
  const errorMessage =
    options.error instanceof Error
      ? options.error.message
      : options.error != null
        ? String(options.error)
        : undefined;

  return {
    feature: options.feature,
    promptVersion: options.promptVersion,
    model: options.model,
    provider: options.provider,
    tier: options.tier,
    inputTokens: options.inputTokens,
    outputTokens: options.outputTokens,
    totalTokens: options.totalTokens,
    latencyMs: options.latencyMs,
    status: options.success ? 'SUCCESS' : 'FAILURE',
    errorCode: options.success ? undefined : 'AI_CALL_FAILED',
    errorMessage: options.success ? undefined : errorMessage,
    metadata: options.metadata,
    triggeredBy: options.triggeredBy,
  };
}
