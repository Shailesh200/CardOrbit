import { z } from 'zod';

export const CONTEXTUAL_NOTIFICATION_TYPES = [
  'MILESTONE_PROGRESS',
  'BILL_DUE',
  'OFFER_MATCH',
  'TRAVEL_TIP',
  'PURCHASE_TIMING',
] as const;

export const ContextualNotificationTypeSchema = z.enum(CONTEXTUAL_NOTIFICATION_TYPES);
export type ContextualNotificationType = z.infer<typeof ContextualNotificationTypeSchema>;

export const BILL_DUE_ALERT_WINDOWS = [0, 1, 3, 7] as const;
export type BillDueAlertWindow = (typeof BILL_DUE_ALERT_WINDOWS)[number];

export const MILESTONE_PROGRESS_WINDOWS = [50, 75, 90] as const;
export type MilestoneProgressWindow = (typeof MILESTONE_PROGRESS_WINDOWS)[number];

export const ContextualNotificationCandidateSchema = z.object({
  type: ContextualNotificationTypeSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  linkUrl: z.string().min(1),
  dedupeKey: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
});

export type ContextualNotificationCandidate = z.infer<typeof ContextualNotificationCandidateSchema>;

export const ContextualNotificationSyncResultSchema = z.object({
  delivered: z.number().int().nonnegative(),
  candidates: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});

export type ContextualNotificationSyncResult = z.infer<
  typeof ContextualNotificationSyncResultSchema
>;
