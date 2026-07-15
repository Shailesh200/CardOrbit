import { IngestCardBundleSchema, RecoExplanationSchema } from '@cardwise/validation';
import { z } from 'zod';

export const RecoGoldenScenarioSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  input: z.object({
    spendContext: z.record(z.unknown()),
    recommendedCard: z.record(z.unknown()),
    alternativeNames: z.array(z.string()),
    breakdown: z.record(z.unknown()),
    audit: z.array(z.record(z.unknown())),
  }),
  referenceExplanation: RecoExplanationSchema,
  expect: z.object({
    mentionsCard: z.boolean().default(true),
    allowedPercents: z.array(z.number()).default([]),
    allowedMultipliers: z.array(z.number()).default([]),
  }),
});

export const RecoGoldenDatasetSchema = z.object({
  version: z.literal(1),
  domain: z.enum(['dining', 'travel']),
  scenarios: z.array(RecoGoldenScenarioSchema).min(1),
});

export const CatalogGoldenEntrySchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  bundle: IngestCardBundleSchema,
  expect: z
    .object({
      minHighlights: z.number().int().nonnegative().default(1),
      minStructuredFees: z.number().int().nonnegative().default(0),
      requiredTags: z.array(z.string()).default([]),
    })
    .default(() => ({
      minHighlights: 1,
      minStructuredFees: 0,
      requiredTags: [],
    })),
});

export const CatalogGoldenDatasetSchema = z.object({
  version: z.literal(1),
  bankSlug: z.string().min(1),
  cards: z.array(CatalogGoldenEntrySchema).min(1),
});

export type RecoGoldenScenario = z.infer<typeof RecoGoldenScenarioSchema>;
export type RecoGoldenDataset = z.infer<typeof RecoGoldenDatasetSchema>;
export type CatalogGoldenEntry = z.infer<typeof CatalogGoldenEntrySchema>;
export type CatalogGoldenDataset = z.infer<typeof CatalogGoldenDatasetSchema>;
