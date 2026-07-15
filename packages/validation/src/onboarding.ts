import { z } from 'zod';

export const ONBOARDING_CATEGORIES = [
  'dining',
  'travel',
  'groceries',
  'fuel',
  'online',
  'other',
] as const;

export const SpendBandSchema = z.enum(['UNDER_10K', '10K_50K', '50K_PLUS']);

export const OnboardingAnswersSchema = z.object({
  spendBand: SpendBandSchema.optional(),
  categories: z.array(z.enum(ONBOARDING_CATEGORIES)).optional(),
});

export type OnboardingAnswers = z.infer<typeof OnboardingAnswersSchema>;
export type SpendBand = z.infer<typeof SpendBandSchema>;

export function parseOnboardingAnswers(input: unknown): OnboardingAnswers {
  return OnboardingAnswersSchema.parse(typeof input === 'object' && input !== null ? input : {});
}

export function safeParseOnboardingAnswers(input: unknown) {
  return OnboardingAnswersSchema.safeParse(
    typeof input === 'object' && input !== null ? input : {},
  );
}
