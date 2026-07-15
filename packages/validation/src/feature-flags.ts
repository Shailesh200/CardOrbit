import { z } from 'zod';

export const FeatureFlagDefinitionSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  description: z.string().nullable().optional(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  updatedBy: z.string().uuid().nullable().optional(),
  updatedAt: z.string().datetime(),
});

export type FeatureFlagDefinitionDto = z.infer<typeof FeatureFlagDefinitionSchema>;

export const UpdateFeatureFlagInputSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export type UpdateFeatureFlagInput = z.infer<typeof UpdateFeatureFlagInputSchema>;

export const FeatureFlagsSnapshotSchema = z.object({
  version: z.string(),
  distinctId: z.string(),
  fetchedAt: z.string().datetime(),
  flags: z.record(z.boolean()),
});

export type FeatureFlagsSnapshot = z.infer<typeof FeatureFlagsSnapshotSchema>;

export function parseUpdateFeatureFlagInput(input: unknown): UpdateFeatureFlagInput {
  return UpdateFeatureFlagInputSchema.parse(input);
}
