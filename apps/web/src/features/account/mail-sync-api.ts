import { authFetch } from '@cardwise/auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type MailSyncMailbox = {
  id: string;
  email: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'NEEDS_REAUTH' | 'DISCONNECTED';
  scopes: string[];
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
};

export type MailboxListResponse = {
  items: MailSyncMailbox[];
  maxMailboxes: number;
  canAddMore: boolean;
};

export type MailSyncJobStatus = {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  message: string;
  messagesScanned: number | null;
  messagesProcessed: number | null;
  transactionsCreated: number | null;
  result: {
    messagesScanned?: number;
    transactionsCreated?: number;
    cardsAutoAdded?: number;
    note?: string;
  } | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type EnqueueMailSyncResponse = {
  enqueued: Array<{
    mailboxId: string;
    email: string;
    job?: { id: string; status: string; message?: string };
    error?: string;
  }>;
  jobs: Array<{
    mailboxId: string;
    email: string;
    jobId: string;
    status: string;
  }>;
};

export async function listMailboxes() {
  return authFetch<MailboxListResponse>('/api/v1/mail-sync/mailboxes', {}, API_BASE);
}

export async function getLinkMailboxUrl() {
  return authFetch<{ url: string }>('/api/v1/mail-sync/oauth/url', {}, API_BASE);
}

export async function disconnectMailbox(id: string) {
  return authFetch<{ ok: true }>(
    `/api/v1/mail-sync/mailboxes/${id}/disconnect`,
    { method: 'POST' },
    API_BASE,
  );
}

export async function enqueueMailSync(body: { mailboxId?: string; userCardId?: string } = {}) {
  return authFetch<EnqueueMailSyncResponse>(
    '/api/v1/mail-sync/sync',
    { method: 'POST', body: JSON.stringify(body) },
    API_BASE,
  );
}

export async function getMailSyncJob(jobId: string) {
  return authFetch<MailSyncJobStatus>(`/api/v1/mail-sync/jobs/${jobId}`, {}, API_BASE);
}

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

export async function waitForMailSyncJobs(
  jobIds: string[],
  onProgress: (status: MailSyncJobStatus) => void,
  options: { intervalMs?: number; signal?: AbortSignal } = {},
): Promise<MailSyncJobStatus[]> {
  const intervalMs = options.intervalMs ?? 1500;
  const remaining = new Set(jobIds);
  const latest = new Map<string, MailSyncJobStatus>();

  while (remaining.size > 0) {
    if (options.signal?.aborted) {
      throw new DOMException('Sync polling aborted', 'AbortError');
    }

    await Promise.all(
      [...remaining].map(async (jobId) => {
        const status = await getMailSyncJob(jobId);
        latest.set(jobId, status);
        onProgress(status);
        if (TERMINAL.has(status.status)) {
          remaining.delete(jobId);
        }
      }),
    );

    if (remaining.size === 0) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return jobIds.map((id) => latest.get(id)!).filter(Boolean);
}
