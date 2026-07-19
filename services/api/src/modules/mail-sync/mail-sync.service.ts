import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { initAnalytics, trackGmailConnected, trackGmailSyncStarted } from '@cardwise/analytics';
import { gmailStatementSyncJob } from '@cardwise/jobs';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { exchangeGoogleCode, getGoogleAuthUrl, getGoogleOAuthConfig } from '../auth/google-oauth';
import { verifyOAuthState } from '../auth/oauth-state';
import { JobsService } from '../jobs/jobs.service';
import { readMailboxRefreshToken, upsertMailSyncMailbox } from './mailbox-store';

const MAX_MAILBOXES = 2;

let analyticsReady = false;

function ensureAnalytics(): void {
  if (!analyticsReady) {
    initAnalytics({
      apiKey: process.env.POSTHOG_API_KEY,
      host: process.env.POSTHOG_HOST,
      useMemory: process.env.NODE_ENV !== 'production' || !process.env.POSTHOG_API_KEY,
    });
    analyticsReady = true;
  }
}

@Injectable()
export class MailSyncService {
  private readonly logger = new Logger(MailSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async listMailboxes(userId: string) {
    const rows = await this.prisma.mailSyncMailbox.findMany({
      where: { userId, status: { not: 'DISCONNECTED' } },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        email: row.email,
        isPrimary: row.isPrimary,
        status: row.status,
        scopes: row.scopes,
        lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
        lastSyncError: row.lastSyncError,
        createdAt: row.createdAt.toISOString(),
      })),
      maxMailboxes: MAX_MAILBOXES,
      canAddMore: rows.length < MAX_MAILBOXES,
    };
  }

  linkMailboxAuthUrl(userId: string): string {
    const config = getGoogleOAuthConfig();
    if (!config) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }
    return getGoogleAuthUrl(config, { intent: 'link_mailbox', userId });
  }

  async completeLinkMailbox(userId: string, code: string): Promise<{ email: string }> {
    const config = getGoogleOAuthConfig();
    if (!config) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }

    const activeCount = await this.prisma.mailSyncMailbox.count({
      where: { userId, status: { not: 'DISCONNECTED' } },
    });
    if (activeCount >= MAX_MAILBOXES) {
      throw new ConflictException('You can connect at most two Google mailboxes');
    }

    const { profile, refreshToken, scopes } = await exchangeGoogleCode(code, config);
    const email = profile.email.toLowerCase();

    const primaryUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!primaryUser) throw new NotFoundException('User not found');

    const isPrimary = primaryUser.email === email;

    try {
      const mailbox = await upsertMailSyncMailbox(this.prisma, {
        userId,
        email,
        googleSub: profile.sub,
        refreshToken,
        scopes,
        isPrimary,
      });
      const mailboxCount = await this.prisma.mailSyncMailbox.count({
        where: { userId, status: { not: 'DISCONNECTED' } },
      });
      ensureAnalytics();
      trackGmailConnected(
        {
          isPrimary,
          mailboxCount,
          source: 'settings',
        },
        { distinctId: userId },
      );
      return { email: mailbox.email };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not link mailbox';
      if (message.includes('already linked')) {
        throw new ConflictException(message);
      }
      throw new BadRequestException(message);
    }
  }

  async disconnectMailbox(userId: string, mailboxId: string): Promise<{ ok: true }> {
    const row = await this.prisma.mailSyncMailbox.findFirst({
      where: { id: mailboxId, userId },
    });
    if (!row) throw new NotFoundException('Mailbox not found');

    await this.prisma.mailSyncMailbox.update({
      where: { id: row.id },
      data: {
        status: 'DISCONNECTED',
        encryptedRefreshToken: 'revoked',
        isPrimary: false,
      },
    });
    return { ok: true };
  }

  async enqueueSync(userId: string, options: { mailboxId?: string; userCardId?: string } = {}) {
    const where = {
      userId,
      status: 'ACTIVE' as const,
      ...(options.mailboxId ? { id: options.mailboxId } : {}),
    };
    const mailboxes = await this.prisma.mailSyncMailbox.findMany({ where });
    if (mailboxes.length === 0) {
      throw new BadRequestException('No active Google mailbox connected');
    }

    const portfolioCount = await this.prisma.userCard.count({
      where: { userId, status: { not: 'REMOVED' } },
    });
    if (portfolioCount === 0) {
      throw new BadRequestException(
        'Add at least one credit card to your portfolio before syncing Gmail transactions',
      );
    }

    const results: Array<{
      mailboxId: string;
      email: string;
      job?: { id: string; status: string; message?: string };
      error?: string;
    }> = [];

    ensureAnalytics();
    for (const mailbox of mailboxes) {
      try {
        const job = await this.jobs.enqueue({
          type: gmailStatementSyncJob.type,
          payload: {
            userId,
            mailboxId: mailbox.id,
            userCardId: options.userCardId,
          },
          triggeredBy: userId,
        });
        trackGmailSyncStarted(
          {
            mailboxId: mailbox.id,
            portfolioCardCount: portfolioCount,
            triggeredBy: 'user',
          },
          { distinctId: userId },
        );
        results.push({
          mailboxId: mailbox.id,
          email: mailbox.email,
          job: { id: job.id, status: job.status, message: job.message },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to enqueue Gmail sync for ${mailbox.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        results.push({
          mailboxId: mailbox.id,
          email: mailbox.email,
          error: error instanceof Error ? error.message : 'Queue unavailable',
        });
      }
    }

    const jobs = results.filter((row) => row.job);
    if (jobs.length === 0) {
      const firstError = results.find((row) => row.error)?.error;
      throw new ServiceUnavailableException(
        firstError ?? 'Could not start Gmail sync. Ensure Redis and the worker are running.',
      );
    }

    return {
      enqueued: results,
      jobs: jobs.map((row) => ({
        mailboxId: row.mailboxId,
        email: row.email,
        jobId: row.job!.id,
        status: row.job!.status,
      })),
    };
  }

  async getSyncJob(userId: string, jobId: string) {
    const row = await this.prisma.jobRun.findUnique({ where: { id: jobId } });
    if (!row || row.type !== gmailStatementSyncJob.type) {
      throw new NotFoundException('Sync job not found');
    }
    const payload =
      row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : {};
    if (payload.userId !== userId && row.triggeredBy !== userId) {
      throw new NotFoundException('Sync job not found');
    }

    const progress =
      row.progress && typeof row.progress === 'object'
        ? (row.progress as Record<string, unknown>)
        : {};
    const result =
      row.result && typeof row.result === 'object' ? (row.result as Record<string, unknown>) : null;

    return {
      id: row.id,
      status: row.status,
      message:
        typeof progress.message === 'string' ? progress.message : (row.errorMessage ?? row.status),
      messagesScanned:
        typeof progress.messagesScanned === 'number' ? progress.messagesScanned : null,
      messagesProcessed:
        typeof progress.messagesProcessed === 'number' ? progress.messagesProcessed : null,
      transactionsCreated:
        typeof progress.transactionsCreated === 'number'
          ? progress.transactionsCreated
          : typeof result?.transactionsCreated === 'number'
            ? result.transactionsCreated
            : null,
      result,
      errorMessage: row.errorMessage,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
    };
  }

  async enqueueSyncAfterCardAdd(userId: string, userCardId: string): Promise<void> {
    const mailboxes = await this.prisma.mailSyncMailbox.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { id: true },
    });
    for (const mailbox of mailboxes) {
      try {
        await this.jobs.enqueue({
          type: gmailStatementSyncJob.type,
          payload: { userId, mailboxId: mailbox.id, userCardId },
          triggeredBy: userId,
        });
      } catch (error) {
        this.logger.warn(
          `Auto Gmail sync skipped for mailbox ${mailbox.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  parseCallbackState(state: string | undefined) {
    return verifyOAuthState(state);
  }

  /** Used by worker / tests — decrypt stored refresh token. */
  decryptRefreshToken(encrypted: string): string {
    return readMailboxRefreshToken(encrypted);
  }
}
