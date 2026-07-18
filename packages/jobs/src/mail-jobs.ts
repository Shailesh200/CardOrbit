import { z } from 'zod';

import type { JobDefinition } from './types';

export const GmailStatementSyncPayloadSchema = z.object({
  userId: z.string().min(1),
  mailboxId: z.string().min(1),
  userCardId: z.string().min(1).optional(),
});

export type GmailStatementSyncPayload = z.infer<typeof GmailStatementSyncPayloadSchema>;

export type GmailStatementSyncProgress = {
  message: string;
  messagesScanned?: number;
  messagesProcessed?: number;
  transactionsCreated?: number;
};

export type GmailStatementSyncResult = {
  messagesScanned: number;
  transactionsCreated: number;
  /** Catalog cards auto-added from bank hints in alerts. */
  cardsAutoAdded?: number;
  note?: string;
};

export const gmailStatementSyncJob: JobDefinition<
  typeof GmailStatementSyncPayloadSchema,
  GmailStatementSyncProgress,
  GmailStatementSyncResult
> = {
  type: 'mail.gmail-statement-sync',
  queue: 'mail',
  description: 'Scan connected Gmail for credit-card alerts and import transactions',
  estimatedMinutes: { min: 1, max: 5 },
  payloadSchema: GmailStatementSyncPayloadSchema,
};
