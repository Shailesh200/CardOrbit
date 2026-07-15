import { z } from 'zod';

export const FinancialCalendarEventTypeSchema = z.enum([
  'bill_due',
  'statement',
  'milestone_end',
  'fee_waiver_end',
  'reward_expiry',
  'offer_expiry',
  'custom_reminder',
]);

export type FinancialCalendarEventType = z.infer<typeof FinancialCalendarEventTypeSchema>;

export const FINANCIAL_CALENDAR_EVENT_TYPES = FinancialCalendarEventTypeSchema.options;

export const FinancialCalendarEventSchema = z.object({
  id: z.string(),
  type: FinancialCalendarEventTypeSchema,
  title: z.string(),
  body: z.string(),
  date: z.string(),
  endsAt: z.string().datetime().nullable(),
  amountInr: z.number().nullable(),
  linkUrl: z.string(),
  cardName: z.string().nullable(),
  status: z.string().nullable(),
  priority: z.enum(['high', 'medium', 'low']),
});

export type FinancialCalendarEvent = z.infer<typeof FinancialCalendarEventSchema>;

export const FinancialCalendarDaySchema = z.object({
  date: z.string(),
  events: z.array(FinancialCalendarEventSchema),
});

export type FinancialCalendarDay = z.infer<typeof FinancialCalendarDaySchema>;

export const FinancialCalendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  types: z.string().optional(),
});

export type FinancialCalendarQueryInput = z.infer<typeof FinancialCalendarQuerySchema>;

export type FinancialCalendarQuery = {
  year: number;
  month: number;
  types?: FinancialCalendarEventType[];
};

export const FinancialCalendarMonthResponseSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  days: z.array(FinancialCalendarDaySchema),
  upcoming: z.array(FinancialCalendarEventSchema),
  countsByType: z.record(z.string(), z.number().int().nonnegative()),
});

export type FinancialCalendarMonthResponse = z.infer<typeof FinancialCalendarMonthResponseSchema>;

export const FinancialCalendarAgendaQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  types: z.string().optional(),
});

export type FinancialCalendarAgendaQuery = {
  days: number;
  types?: FinancialCalendarEventType[];
};

export const FinancialCalendarAgendaResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  items: z.array(FinancialCalendarEventSchema),
});

export type FinancialCalendarAgendaResponse = z.infer<typeof FinancialCalendarAgendaResponseSchema>;

export const TimelineEventCategorySchema = z.enum([
  'card',
  'transaction',
  'billing',
  'reward',
  'notification',
  'offer',
  'milestone',
  'reminder',
]);

export type TimelineEventCategory = z.infer<typeof TimelineEventCategorySchema>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  category: TimelineEventCategorySchema,
  title: z.string(),
  body: z.string(),
  occurredAt: z.string().datetime(),
  linkUrl: z.string().nullable(),
  amountInr: z.number().nullable(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const TimelineQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
  category: TimelineEventCategorySchema.optional(),
});

export type TimelineQuery = z.infer<typeof TimelineQuerySchema>;

export const TimelineResponseSchema = z.object({
  items: z.array(TimelineEventSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type TimelineResponse = z.infer<typeof TimelineResponseSchema>;

export const CreateCalendarReminderSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  eventDate: z.string().datetime(),
  reminderOffsetDays: z.number().int().min(0).max(90).default(0),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

export type CreateCalendarReminderInput = z.infer<typeof CreateCalendarReminderSchema>;

export const UpdateCalendarReminderSchema = CreateCalendarReminderSchema.partial();

export type UpdateCalendarReminderInput = z.infer<typeof UpdateCalendarReminderSchema>;

export const CalendarReminderSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  eventDate: z.string().datetime(),
  reminderOffsetDays: z.number().int().nonnegative(),
  priority: z.enum(['high', 'medium', 'low']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CalendarReminder = z.infer<typeof CalendarReminderSchema>;

function parseTypeFilter(raw?: string): FinancialCalendarEventType[] | undefined {
  if (!raw?.trim()) return undefined;
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const parsed = parts
    .map((part) => FinancialCalendarEventTypeSchema.safeParse(part))
    .filter((result) => result.success)
    .map((result) => result.data);
  return parsed.length > 0 ? parsed : undefined;
}

export function parseFinancialCalendarQuery(input: unknown): FinancialCalendarQuery {
  const raw = FinancialCalendarQuerySchema.parse(input ?? {});
  return {
    year: raw.year,
    month: raw.month,
    types: parseTypeFilter(raw.types),
  };
}

export function parseFinancialCalendarAgendaQuery(input: unknown): FinancialCalendarAgendaQuery {
  const raw = FinancialCalendarAgendaQuerySchema.parse(input ?? {});
  return {
    days: raw.days,
    types: parseTypeFilter(raw.types),
  };
}

export function parseTimelineQuery(input: unknown): TimelineQuery {
  return TimelineQuerySchema.parse(input ?? {});
}

export function parseCreateCalendarReminderInput(input: unknown): CreateCalendarReminderInput {
  return CreateCalendarReminderSchema.parse(input ?? {});
}

export function parseUpdateCalendarReminderInput(input: unknown): UpdateCalendarReminderInput {
  return UpdateCalendarReminderSchema.parse(input ?? {});
}
