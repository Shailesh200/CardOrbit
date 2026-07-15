import { z } from 'zod';

import { AiFeatureSchema } from './platform';

export const AiModelTierSchema = z.enum(['fast', 'quality', 'ping']);

export type AiModelTier = z.infer<typeof AiModelTierSchema>;

export const CreateAiPromptVersionSchema = z.object({
  feature: AiFeatureSchema,
  version: z.string().trim().min(1).max(32),
  systemPrompt: z.string().trim().min(10),
  userTemplate: z.string().trim().optional(),
  modelTier: AiModelTierSchema.optional(),
  modelOverride: z.string().trim().max(128).optional(),
  activate: z.boolean().optional(),
});

export type CreateAiPromptVersionInput = z.infer<typeof CreateAiPromptVersionSchema>;

export const UpdateAiPromptVersionSchema = z.object({
  systemPrompt: z.string().trim().min(10).optional(),
  userTemplate: z.string().trim().nullable().optional(),
  modelTier: AiModelTierSchema.nullable().optional(),
  modelOverride: z.string().trim().max(128).nullable().optional(),
});

export type UpdateAiPromptVersionInput = z.infer<typeof UpdateAiPromptVersionSchema>;

export const AiTaskRoutingSchema = z.object({
  feature: AiFeatureSchema,
  activeVersion: z.string().nullable(),
  modelTier: AiModelTierSchema.nullable(),
  modelOverride: z.string().nullable(),
  envDefaultModel: z.string(),
  effectiveModel: z.string(),
});

export type AiTaskRouting = z.infer<typeof AiTaskRoutingSchema>;

export function parseCreateAiPromptVersionInput(raw: unknown): CreateAiPromptVersionInput {
  return CreateAiPromptVersionSchema.parse(raw);
}

export function parseUpdateAiPromptVersionInput(raw: unknown): UpdateAiPromptVersionInput {
  return UpdateAiPromptVersionSchema.parse(raw);
}
