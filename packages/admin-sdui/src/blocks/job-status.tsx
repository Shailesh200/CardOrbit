import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from '@cardwise/ui';
import { ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useJobEvents } from '../hooks/useJobEvents';
import { toSafeMessage } from '../lib/sanitize-message';
import type { SduiActionContext } from '../types';

type JobFetchResult = {
  id: string;
  type?: string;
  status: string;
  payload?: Record<string, unknown> | null;
  progress?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  estimatedMinutes?: { min: number; max: number } | null;
  message?: string;
};

const PHASE_LABEL: Record<string, string> = {
  discovering: 'Discovering URLs',
  fetching: 'Fetching page',
  structuring: 'AI structuring',
  staging: 'Staging import item',
  waiting: 'Between items',
  done: 'Item complete',
};

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRunningStatus(status: string | undefined): boolean {
  return status === 'QUEUED' || status === 'PROCESSING';
}

type ActiveJobSummary = {
  id: string;
  type: string;
  status: string;
  jobLabel?: string;
  targetLabel?: string;
};

function filterRunningJobs(items: ActiveJobSummary[]): ActiveJobSummary[] {
  return items.filter((job) => isRunningStatus(job.status));
}

export function JobStatusBlock({
  ctx,
  fetchJob,
  listActiveJobs,
  cancelJob,
  apiBase,
  getToken,
}: {
  ctx: SduiActionContext;
  fetchJob: (id: string) => Promise<JobFetchResult>;
  listActiveJobs?: () => Promise<{ items: ActiveJobSummary[] }>;
  cancelJob?: (id: string) => Promise<{ status: string }>;
  apiBase?: string;
  getToken?: () => string | null;
}) {
  const [activeJobs, setActiveJobs] = useState<ActiveJobSummary[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const completedRef = useRef(false);
  const sawRunningRef = useRef(false);

  const refreshActive = useCallback(async () => {
    if (!listActiveJobs) {
      setActiveJobs([]);
      setLoadingActive(false);
      return [];
    }
    setLoadingActive(true);
    try {
      const data = await listActiveJobs();
      const running = filterRunningJobs(data.items);
      setActiveJobs(running);
      return running;
    } catch {
      setActiveJobs([]);
      return [];
    } finally {
      setLoadingActive(false);
    }
  }, [listActiveJobs]);

  // One-shot fetch on mount and when a new job is enqueued — no background polling.
  useEffect(() => {
    void refreshActive();
  }, [refreshActive, ctx.activeJobId]);

  useEffect(() => {
    if (ctx.activeJobId) {
      setTrackedJobId(ctx.activeJobId);
      return;
    }
    setTrackedJobId((current) => {
      if (current && activeJobs.some((job) => job.id === current)) return current;
      return activeJobs[0]?.id ?? null;
    });
  }, [ctx.activeJobId, activeJobs]);

  const { job, connected } = useJobEvents(trackedJobId, { fetchJob, apiBase, getToken });

  useEffect(() => {
    if (isRunningStatus(job?.status)) {
      sawRunningRef.current = true;
    }
  }, [job?.status]);

  useEffect(() => {
    if (!job?.status || isRunningStatus(job.status)) return;

    if (job.status === 'COMPLETED' && sawRunningRef.current && !completedRef.current) {
      completedRef.current = true;
      ctx.onJobComplete?.((job.result as Record<string, unknown> | null) ?? null);
    }
    if (job.status === 'FAILED' || job.status === 'CANCELLED') {
      completedRef.current = false;
    }

    if (ctx.activeJobId === job.id) {
      ctx.setActiveJobId(null);
    }
    setTrackedJobId(null);
    void refreshActive();
  }, [ctx, job?.id, job?.result, job?.status, refreshActive]);

  const runningJob = job && isRunningStatus(job.status) ? job : null;
  const showRunningCard = Boolean(runningJob) || activeJobs.length > 0;

  if (loadingActive && activeJobs.length === 0 && !ctx.activeJobId) {
    return (
      <Card className="admin-panel">
        <CardContent className="pt-6">
          <div className="admin-loading" role="status">
            <span className="admin-loading__dot" />
            <span className="admin-loading__dot" />
            <span className="admin-loading__dot" />
            Checking for active syncs…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showRunningCard || !runningJob) {
    if (showRunningCard && !runningJob && trackedJobId) {
      return (
        <Card className="admin-panel admin-panel--accent">
          <CardContent className="pt-6">
            <div className="admin-loading" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Connecting to active sync…
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="admin-panel admin-panel--accent">
        <CardHeader>
          <CardTitle className="font-display text-xl">Sync status</CardTitle>
          <CardDescription>No syncs are running or queued right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start a background sync above. Active jobs will appear here with live progress via SSE.
            Use sync history below to review completed runs and activity logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  const progress = runningJob.progress ?? {};
  const done = asNumber(progress.done);
  const total = asNumber(progress.total);
  const itemCount = asNumber(progress.itemCount) ?? 0;
  const failedCount = asNumber(progress.failedCount) ?? 0;
  const pct = done != null && total ? Math.round((done / total) * 100) : null;
  const phase = asString(progress.phase);
  const currentUrl = asString(progress.currentUrl);
  const currentItemLabel = asString(progress.currentItemLabel);
  const lastStagedName = asString(progress.lastStagedName);
  const bankSlug = asString(progress.bankSlug) ?? asString(runningJob.payload?.bankSlug);
  const batchId = asString(progress.batchId) ?? asString(runningJob.result?.batchId);
  const cancelTargetId = trackedJobId ?? runningJob.id;

  async function onCancelSync() {
    if (!cancelJob || !cancelTargetId || cancelling) return;
    setCancelling(true);
    try {
      await cancelJob(cancelTargetId);
      completedRef.current = false;
      sawRunningRef.current = false;
      ctx.setActiveJobId(null);
      setTrackedJobId(null);
      await refreshActive();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card className="admin-panel admin-panel--accent">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Active sync
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeJobs.length > 1 ? (
              <Badge variant="outline">{activeJobs.length} running</Badge>
            ) : null}
            <Badge variant="secondary">{runningJob.status}</Badge>
          </div>
        </div>
        <CardDescription>
          {bankSlug ? `${bankSlug} · ` : ''}
          {runningJob.type ?? 'background job'}
          {connected ? ' · live' : ''}
          {runningJob.estimatedMinutes
            ? ` · est. ${runningJob.estimatedMinutes.min}–${runningJob.estimatedMinutes.max} min`
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeJobs.length > 1 ? (
          <div className="admin-tabs__list">
            {activeJobs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={trackedJobId === item.id ? 'is-active' : undefined}
                onClick={() => {
                  setTrackedJobId(item.id);
                  ctx.setActiveJobId(item.id);
                }}
              >
                {item.targetLabel ?? item.jobLabel ?? item.type} · {item.status}
              </button>
            ))}
          </div>
        ) : null}

        <div className="admin-job-stats">
          <div>
            <p className="admin-job-stats__label">Progress</p>
            <p className="admin-job-stats__value">{done != null && total ? `${done}/${total}` : '—'}</p>
          </div>
          <div>
            <p className="admin-job-stats__label">Staged</p>
            <p className="admin-job-stats__value">{itemCount}</p>
          </div>
          <div>
            <p className="admin-job-stats__label">Failed</p>
            <p className="admin-job-stats__value">{failedCount}</p>
          </div>
          <div>
            <p className="admin-job-stats__label">Phase</p>
            <p className="admin-job-stats__value">{phase ? (PHASE_LABEL[phase] ?? phase) : '—'}</p>
          </div>
        </div>

        {pct != null ? (
          <div className="space-y-2">
            <Progress value={pct} />
            <p className="text-sm text-muted-foreground">
              {asString(progress.message) ?? `${pct}% complete`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {asString(progress.message) ?? 'Waiting for worker…'}
          </p>
        )}

        {(currentUrl || currentItemLabel || lastStagedName) && (
          <div className="admin-job-current">
            <p className="admin-job-current__title">Current item</p>
            {currentItemLabel ? <p className="admin-job-current__name">{currentItemLabel}</p> : null}
            {currentUrl ? (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-job-current__url"
              >
                {currentUrl}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : lastStagedName ? (
              <p className="text-sm text-muted-foreground">Last staged: {lastStagedName}</p>
            ) : null}
          </div>
        )}

        {batchId ? (
          <p className="text-xs text-muted-foreground">
            Import batch: <code className="text-xs">{batchId}</code>
          </p>
        ) : null}

        {runningJob.errorMessage ? (
          <p className="text-sm text-destructive">
            {toSafeMessage(runningJob.errorMessage, 'This sync hit an error. Try again or check logs below.')}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {cancelJob ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={cancelling}
              onClick={() => void onCancelSync()}
            >
              {cancelling ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              <XCircle className="size-3.5" aria-hidden />
              Cancel sync
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => void refreshActive()}>
            <RefreshCw className="size-3.5" aria-hidden />
            Refresh status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
