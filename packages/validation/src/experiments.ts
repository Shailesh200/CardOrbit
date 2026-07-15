import { z } from 'zod';

export const ExperimentDefinitionSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  variants: z.array(z.string().min(1)).min(2),
  defaultVariant: z.string().min(1),
  enabled: z.boolean(),
  rolloutPercentage: z.number().int().min(0).max(100),
  updatedBy: z.string().uuid().nullable().optional(),
  updatedAt: z.string().datetime(),
});

export type ExperimentDefinitionDto = z.infer<typeof ExperimentDefinitionSchema>;

export const UpdateExperimentInputSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  name: z.string().min(1).max(120).optional(),
});

export type UpdateExperimentInput = z.infer<typeof UpdateExperimentInputSchema>;

export const ExperimentsSnapshotSchema = z.object({
  version: z.string(),
  distinctId: z.string(),
  fetchedAt: z.string().datetime(),
  assignments: z.record(z.string()),
});

export type ExperimentsSnapshot = z.infer<typeof ExperimentsSnapshotSchema>;

export function parseUpdateExperimentInput(input: unknown): UpdateExperimentInput {
  return UpdateExperimentInputSchema.parse(input);
}

/** Seed definitions for M-034 experimentation platform. */
export const DEFAULT_EXPERIMENT_DEFINITIONS = [
  {
    key: 'reco_ranking_v2',
    name: 'Recommendation ranking V2',
    description: 'Compare baseline ranking vs AI ranking signals enrichment.',
    variants: ['control', 'ranking_signals'],
    defaultVariant: 'control',
    enabled: true,
    rolloutPercentage: 50,
  },
  {
    key: 'dashboard_layout_v2',
    name: 'Dashboard layout experiment',
    description: 'Insights-first dashboard layout vs default widget order.',
    variants: ['control', 'insights_first'],
    defaultVariant: 'control',
    enabled: false,
    rolloutPercentage: 0,
  },
] as const;

export type DefaultExperimentKey = (typeof DEFAULT_EXPERIMENT_DEFINITIONS)[number]['key'];
