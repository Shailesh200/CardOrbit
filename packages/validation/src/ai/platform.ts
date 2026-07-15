import { z } from 'zod';

/** Canonical AI task identifiers — used in AiRun.feature and prompt registry. */
export const AiFeatureSchema = z.enum([
  'ping',
  'catalog-structure',
  'reco-explain',
  'smart-insights',
  'ranking-signals',
  'merchant-enrichment',
  'offer-parsing',
  'admin-insights',
  'semantic-search',
  'assistant',
  'rag-answer',
]);

export type AiFeature = z.infer<typeof AiFeatureSchema>;

export const AiRunStatusSchema = z.enum(['SUCCESS', 'FAILURE']);

export type AiRunStatus = z.infer<typeof AiRunStatusSchema>;

export const AiRunLogInputSchema = z.object({
  feature: AiFeatureSchema,
  promptVersion: z.string().optional(),
  model: z.string(),
  provider: z.string(),
  tier: z.enum(['fast', 'quality', 'ping']).optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  latencyMs: z.number().int().nonnegative(),
  status: AiRunStatusSchema,
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  triggeredBy: z.string().optional(),
});

export type AiRunLogInput = z.infer<typeof AiRunLogInputSchema>;

export const AiPlatformStatusSchema = z.object({
  configured: z.boolean(),
  provider: z.string().optional(),
  defaultModel: z.string().optional(),
  fastModel: z.string().optional(),
  qualityModel: z.string().optional(),
  pingModel: z.string().optional(),
  platformEnabled: z.boolean(),
  flags: z.record(z.boolean()),
});

export type AiPlatformStatus = z.infer<typeof AiPlatformStatusSchema>;
