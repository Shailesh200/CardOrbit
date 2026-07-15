import { z } from 'zod';

import { CreateCalendarReminderSchema } from '../financial-calendar';
import { RagCitationSchema } from './rag';

export const AssistantMessageRoleSchema = z.enum(['user', 'assistant']);

export type AssistantMessageRole = z.infer<typeof AssistantMessageRoleSchema>;

export const AssistantChatMessageSchema = z.object({
  role: AssistantMessageRoleSchema,
  content: z.string().trim().min(1).max(2000),
});

export type AssistantChatMessage = z.infer<typeof AssistantChatMessageSchema>;

export const AssistantChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
  history: z.array(AssistantChatMessageSchema).max(12).optional(),
});

export type AssistantChatRequest = z.infer<typeof AssistantChatRequestSchema>;

export const AssistantIntentSchema = z.enum([
  'recommendation',
  'list_cards',
  'catalog_qa',
  'weekly_optimize',
  'calendar_agenda',
  'propose_reminder',
  'general',
]);

export type AssistantIntent = z.infer<typeof AssistantIntentSchema>;

export const AssistantIntentOutputSchema = z.object({
  intent: AssistantIntentSchema,
  searchQuery: z.string().trim().max(500).optional(),
  merchantSlug: z.string().trim().max(120).optional(),
  merchantName: z.string().trim().max(120).optional(),
  categorySlug: z.string().trim().max(120).optional(),
  amount: z.number().positive().max(10_000_000).optional(),
  reminderTitle: z.string().trim().max(120).optional(),
});

export type AssistantIntentOutput = z.infer<typeof AssistantIntentOutputSchema>;

export const AssistantTurnOutputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  confidence: z.enum(['high', 'medium', 'low']),
});

export type AssistantTurnOutput = z.infer<typeof AssistantTurnOutputSchema>;

export const AssistantActionTypeSchema = z.enum([
  'VIEW_CARD',
  'VIEW_MERCHANT',
  'OPEN_MERCHANT',
  'OPEN_CATALOG',
  'OPEN_CALENDAR',
  'OPEN_WALLET',
  'OPEN_MILESTONES',
  'CONFIRM_PROPOSAL',
]);

export type AssistantActionType = z.infer<typeof AssistantActionTypeSchema>;

export const AssistantActionSchema = z.object({
  type: AssistantActionTypeSchema,
  id: z.string().uuid().optional(),
  slug: z.string().optional(),
  label: z.string().optional(),
});

export type AssistantAction = z.infer<typeof AssistantActionSchema>;

export const AssistantToolNameSchema = z.enum([
  'getRecommendation',
  'listCards',
  'rag',
  'getWeeklyOptimization',
  'getCalendarAgenda',
  'proposeReminder',
]);

export type AssistantToolName = z.infer<typeof AssistantToolNameSchema>;

export const AssistantResultKindSchema = z.enum([
  'card',
  'merchant',
  'portfolio_card',
  'offer',
  'insight',
  'agenda_item',
]);

export type AssistantResultKind = z.infer<typeof AssistantResultKindSchema>;

export const AssistantResultItemSchema = z.object({
  kind: AssistantResultKindSchema,
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  highlights: z.array(z.string()).max(6).optional(),
  badge: z.string().optional(),
  inPortfolio: z.boolean().optional(),
  userCardId: z.string().uuid().optional(),
});

export type AssistantResultItem = z.infer<typeof AssistantResultItemSchema>;

export const AssistantProposalTypeSchema = z.enum(['CREATE_REMINDER']);
export type AssistantProposalType = z.infer<typeof AssistantProposalTypeSchema>;

export const AssistantProposalStatusSchema = z.enum(['pending', 'confirmed', 'cancelled']);
export type AssistantProposalStatus = z.infer<typeof AssistantProposalStatusSchema>;

export const AssistantProposalSchema = z.object({
  id: z.string().uuid(),
  type: AssistantProposalTypeSchema,
  label: z.string().min(1),
  status: AssistantProposalStatusSchema,
  detail: z.string().min(1),
  payload: CreateCalendarReminderSchema,
});

export type AssistantProposal = z.infer<typeof AssistantProposalSchema>;

export const AssistantMessageMetadataSchema = z.object({
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  toolsUsed: z.array(AssistantToolNameSchema).optional(),
  citations: z.array(RagCitationSchema).optional(),
  results: z.array(AssistantResultItemSchema).optional(),
  proposals: z.array(AssistantProposalSchema).optional(),
  mode: z.enum(['assistant', 'copilot']).optional(),
});

export type AssistantMessageMetadata = z.infer<typeof AssistantMessageMetadataSchema>;

export const AssistantStoredMessageSchema = z.discriminatedUnion('role', [
  AssistantChatMessageSchema.extend({ role: z.literal('user') }),
  AssistantChatMessageSchema.extend({
    role: z.literal('assistant'),
    confidence: z.enum(['high', 'medium', 'low']).optional(),
    toolsUsed: z.array(AssistantToolNameSchema).optional(),
    citations: z.array(RagCitationSchema).optional(),
    results: z.array(AssistantResultItemSchema).optional(),
    proposals: z.array(AssistantProposalSchema).optional(),
  }),
]);

export type AssistantStoredMessage = z.infer<typeof AssistantStoredMessageSchema>;

export const AssistantConversationSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(AssistantStoredMessageSchema).max(50),
});

export type AssistantConversation = z.infer<typeof AssistantConversationSchema>;

export const AssistantChatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string(),
  /** True when no confirmable write proposals are pending. */
  readOnly: z.boolean(),
  mode: z.enum(['assistant', 'copilot']),
  confidence: z.enum(['high', 'medium', 'low']),
  toolsUsed: z.array(AssistantToolNameSchema),
  citations: z.array(RagCitationSchema),
  actions: z.array(AssistantActionSchema),
  results: z.array(AssistantResultItemSchema),
  proposals: z.array(AssistantProposalSchema).default([]),
});

export type AssistantChatResponse = z.infer<typeof AssistantChatResponseSchema>;

export const AssistantStatusSchema = z.object({
  enabled: z.boolean(),
  configured: z.boolean(),
  mode: z.enum(['off', 'assistant', 'copilot']),
  copilotEnabled: z.boolean(),
});

export type AssistantStatus = z.infer<typeof AssistantStatusSchema>;

export const AssistantConfirmProposalInputSchema = z.object({
  conversationId: z.string().uuid(),
  proposalId: z.string().uuid(),
  confirmed: z.boolean().default(true),
});

export type AssistantConfirmProposalInput = z.infer<typeof AssistantConfirmProposalInputSchema>;

export const AssistantConfirmProposalResultSchema = z.object({
  ok: z.boolean(),
  proposalId: z.string().uuid(),
  status: AssistantProposalStatusSchema,
  reminderId: z.string().nullable(),
  detail: z.string(),
});

export type AssistantConfirmProposalResult = z.infer<typeof AssistantConfirmProposalResultSchema>;

export function parseAssistantChatRequest(input: unknown): AssistantChatRequest {
  return AssistantChatRequestSchema.parse(input);
}

export function parseAssistantConfirmProposalInput(input: unknown): AssistantConfirmProposalInput {
  return AssistantConfirmProposalInputSchema.parse(input ?? {});
}
