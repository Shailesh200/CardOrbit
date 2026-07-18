import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@cardwise/ui';

import { GoogleConnectButton } from '../../components/auth/GoogleSignInButton';
import { notify, toast } from '../../lib/app-toast';
import {
  disconnectMailbox,
  enqueueMailSync,
  getLinkMailboxUrl,
  listMailboxes,
  waitForMailSyncJobs,
  type MailSyncJobStatus,
  type MailSyncMailbox,
} from './mail-sync-api';

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never synced';
  return `Last sync ${new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })}`;
}

function summarizeJobs(statuses: MailSyncJobStatus[]): string {
  const imported = statuses.reduce(
    (sum, row) => sum + (row.transactionsCreated ?? row.result?.transactionsCreated ?? 0),
    0,
  );
  const cardsAdded = statuses.reduce((sum, row) => sum + (row.result?.cardsAutoAdded ?? 0), 0);
  const failed = statuses.filter((row) => row.status === 'FAILED' || row.status === 'CANCELLED');
  if (failed.length === statuses.length) {
    return failed[0]?.errorMessage ?? failed[0]?.message ?? 'Gmail sync failed';
  }
  const parts: string[] = [];
  if (cardsAdded > 0) {
    parts.push(`Added ${cardsAdded} card${cardsAdded === 1 ? '' : 's'} from bank alerts`);
  }
  if (imported > 0) {
    parts.push(`imported ${imported} transaction${imported === 1 ? '' : 's'}`);
  }
  if (parts.length > 0) return parts.join(' · ');
  const note = statuses.map((row) => row.result?.note).find(Boolean);
  return note ?? 'Gmail sync finished — no new transactions';
}

function mailboxErrorMessage(code: string | null): string {
  if (!code) return 'Could not connect Google mailbox';
  if (/access_denied|unverified|verification|403|blocked/i.test(code)) {
    return 'Google blocked Gmail access — the app is still in Testing. Add your Google account as a test user in Google Cloud Console (OAuth consent screen), then try again via Advanced → Continue.';
  }
  return 'Could not connect Google mailbox';
}

export function GoogleMailSection() {
  const [params, setParams] = useSearchParams();
  const [mailboxes, setMailboxes] = useState<MailSyncMailbox[]>([]);
  const [canAddMore, setCanAddMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const response = await listMailboxes();
      setMailboxes(response.items);
      setCanAddMore(response.canAddMore);
    } catch (error) {
      notify.fromError(error, 'Failed to load mailboxes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const mailbox = params.get('mailbox');
    if (!mailbox) return;
    if (mailbox === 'connected') {
      toast.success('Google mailbox connected');
      void refresh();
    } else if (mailbox === 'error') {
      toast.error(mailboxErrorMessage(params.get('error') ?? params.get('reason')));
    }
    const next = new URLSearchParams(params);
    next.delete('mailbox');
    next.delete('error');
    next.delete('reason');
    setParams(next, { replace: true });
  }, [params, setParams]);

  async function onConnect() {
    try {
      const { url } = await getLinkMailboxUrl();
      window.location.href = url;
    } catch (error) {
      notify.fromError(error, 'Could not start Google connect');
    }
  }

  async function onDisconnect(id: string) {
    setBusyId(id);
    try {
      await disconnectMailbox(id);
      toast.success('Mailbox disconnected');
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Disconnect failed');
    } finally {
      setBusyId(null);
    }
  }

  async function onSync(mailboxId?: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusyId(mailboxId ?? 'all');
    setSyncProgress('Queuing Gmail sync…');
    try {
      const response = await enqueueMailSync(mailboxId ? { mailboxId } : {});
      const jobIds = response.jobs.map((job) => job.jobId);
      if (jobIds.length === 0) {
        throw new Error('No sync jobs were started');
      }

      setSyncProgress('Sync started — searching Gmail…');
      const statuses = await waitForMailSyncJobs(
        jobIds,
        (status) => {
          setSyncProgress(status.message || 'Syncing…');
        },
        { signal: controller.signal },
      );

      const summary = summarizeJobs(statuses);
      const allFailed = statuses.every(
        (row) => row.status === 'FAILED' || row.status === 'CANCELLED',
      );
      if (allFailed) {
        toast.error(summary);
      } else {
        toast.success(summary);
      }
      await refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify.fromError(error, 'Sync failed to start');
    } finally {
      setBusyId(null);
      setSyncProgress(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Google mail</h2>
        <p className="text-sm text-muted-foreground">
          Connect Gmail to import credit-card spend alerts into your timeline. CardOrbit can also
          detect banks from those alerts and add matching catalog cards to your portfolio. Your
          sign-in Google account is the primary mailbox; you can add one alternate inbox.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Gmail access is in Google Testing</p>
        <p className="mt-1">
          Until CardOrbit completes Google verification, only listed{' '}
          <span className="text-foreground">test users</span> can grant{' '}
          <code className="text-xs">gmail.readonly</code>. Add your address in Google Cloud → OAuth
          consent screen → Test users. If you see “Google hasn’t verified this app”, open{' '}
          <span className="text-foreground">Advanced</span> → continue (test users only).
        </p>
      </div>

      {syncProgress ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <p className="font-medium">Sync in progress</p>
          <p className="mt-1 text-muted-foreground">{syncProgress}</p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : mailboxes.length === 0 ? (
        <div className="max-w-sm space-y-3">
          <p className="text-sm text-muted-foreground">No Google mailbox connected yet.</p>
          <GoogleConnectButton label="Connect with Google" onClick={() => void onConnect()} />
        </div>
      ) : (
        <ul className="max-w-xl space-y-3">
          {mailboxes.map((mailbox) => (
            <li
              key={mailbox.id}
              className="flex flex-col gap-2 rounded-lg border border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">
                  {mailbox.email}
                  {mailbox.isPrimary ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">Primary</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {mailbox.status === 'NEEDS_REAUTH'
                    ? 'Needs reconnect'
                    : formatSyncTime(mailbox.lastSyncAt)}
                  {mailbox.lastSyncError ? ` · ${mailbox.lastSyncError}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {mailbox.status === 'NEEDS_REAUTH' ? (
                  <GoogleConnectButton
                    label="Reconnect Google"
                    onClick={() => void onConnect()}
                    className="h-9 w-auto px-3 text-xs"
                  />
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId != null}
                    onClick={() => void onSync(mailbox.id)}
                  >
                    {busyId === mailbox.id ? 'Syncing…' : 'Sync now'}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busyId != null}
                  onClick={() => void onDisconnect(mailbox.id)}
                >
                  Disconnect
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAddMore && mailboxes.length > 0 ? (
        <div className="max-w-sm">
          <GoogleConnectButton
            label="Add another Google mailbox"
            onClick={() => void onConnect()}
          />
        </div>
      ) : null}

      {mailboxes.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          After sync, review auto-added cards on{' '}
          <Link to="/account/cards" className="font-medium text-primary hover:underline">
            Cards
          </Link>{' '}
          and imported spend on{' '}
          <Link to="/account/transactions" className="font-medium text-primary hover:underline">
            Transactions
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}
