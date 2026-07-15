import { z } from 'zod';

export const RecoExplanationSchema = z.object({
  explanation: z.string().describe('2-4 sentences for UI'),
  shortSummary: z.string().describe('≤120 chars for hero/showcase'),
  bulletReasons: z.array(z.string()).min(1).max(3),
});

export type RecoExplanation = z.infer<typeof RecoExplanationSchema>;
