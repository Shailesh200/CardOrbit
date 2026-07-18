import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@cardwise/ui';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Fragment, useCallback, useEffect, useState } from 'react';

import { toSafeMessage } from '../lib/sanitize-message';
import type { SduiActionContext } from '../types';

type JobRow = Record<string, unknown>;

type JobLogEntry = {
  at: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
};

function parseLogs(value: unknown): JobLogEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is JobLogEntry =>
      !!row &&
      typeof row === 'object' &&
      typeof (row as JobLogEntry).message === 'string' &&
      typeof (row as JobLogEntry).at === 'string',
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function logLevelClass(level: JobLogEntry['level']): string {
  switch (level) {
    case 'success':
      return 'admin-job-log__line--success';
    case 'warn':
      return 'admin-job-log__line--warn';
    case 'error':
      return 'admin-job-log__line--error';
    default:
      return 'admin-job-log__line--info';
  }
}

function formatCell(value: unknown, format?: string) {
  if (value == null || value === '') return '—';
  if (format === 'badge') return <Badge variant="secondary">{String(value)}</Badge>;
  if (format === 'date') return new Date(String(value)).toLocaleString('en-IN');
  return String(value);
}

type SyncHistoryBlockProps = {
  ctx: SduiActionContext;
  fetchJob: (id: string) => Promise<{
    id: string;
    progress?: Record<string, unknown> | null;
  }>;
  columns: Array<{ key: string; label: string; format?: string }>;
};

export function SyncHistoryBlock({ ctx, fetchJob, columns }: SyncHistoryBlockProps) {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logCache, setLogCache] = useState<Record<string, JobLogEntry[]>>({});
  const [logsLoading, setLogsLoading] = useState<string | null>(null);
  const pageSize = 10;

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void ctx
      .fetchData('admin.jobs.recent', { limit: pageSize, offset: page * pageSize })
      .then((data) => {
        const payload = data as { items?: JobRow[] };
        setRows(payload.items ?? []);
      })
      .catch((error: unknown) => {
        setLoadError(toSafeMessage(error instanceof Error ? error.message : '', 'Failed to load sync history.'));
      })
      .finally(() => setLoading(false));
  }, [ctx, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function onComplete() {
      refresh();
    }
    window.addEventListener('cardwise:admin-job-complete', onComplete);
    return () => window.removeEventListener('cardwise:admin-job-complete', onComplete);
  }, [refresh]);

  async function toggleLogs(jobId: string) {
    if (expandedId === jobId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(jobId);
    if (logCache[jobId]) return;

    setLogsLoading(jobId);
    try {
      const job = await fetchJob(jobId);
      const logs = parseLogs(job.progress?.logs);
      setLogCache((prev) => ({ ...prev, [jobId]: logs }));
    } finally {
      setLogsLoading(null);
    }
  }

  const colSpan = columns.length + 1;

  return (
    <Card className="admin-panel">
      <CardHeader>
        <CardTitle className="font-display text-xl">Sync history</CardTitle>
        <CardDescription>Past and recent background sync runs — expand a row to view activity logs.</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="admin-loading" role="status">
            <span className="admin-loading__dot" />
            <span className="admin-loading__dot" />
            <span className="admin-loading__dot" />
            Loading sync history…
          </div>
        ) : loadError ? (
          <div className="admin-error-state" role="alert">
            <AlertTriangle className="admin-error-state__icon" aria-hidden />
            <div className="admin-error-state__copy">
              <p className="admin-error-state__title">Could not load sync history</p>
              <p className="admin-error-state__desc">{loadError}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="admin-empty">No sync runs yet. Start a job above to see history here.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Logs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const id = String(row.id ?? index);
                  const isExpanded = expandedId === id;
                  const logs = logCache[id] ?? parseLogs((row.progress as Record<string, unknown> | undefined)?.logs);

                  return (
                    <Fragment key={id}>
                      <tr>
                        {columns.map((col) => (
                          <td key={col.key}>{formatCell(row[col.key], col.format)}</td>
                        ))}
                        <td className="admin-table__actions">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleLogs(id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="size-3.5" aria-hidden />
                                Hide logs
                              </>
                            ) : (
                              <>
                                <ChevronDown className="size-3.5" aria-hidden />
                                Show logs
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="admin-table__expand-row">
                          <td colSpan={colSpan}>
                            <div className="admin-job-log admin-job-log--inline">
                              <p className="admin-job-log__title">Activity log</p>
                              {logsLoading === id ? (
                                <div className="admin-loading" role="status">
                                  <span className="admin-loading__dot" />
                                  Loading logs…
                                </div>
                              ) : (
                                <div
                                  className="admin-job-log__scroll"
                                  role="log"
                                  aria-live="polite"
                                  aria-relevant="additions"
                                >
                                  {logs.length ? (
                                    logs.map((entry, logIndex) => (
                                      <div
                                        key={`${entry.at}-${logIndex}`}
                                        className={`admin-job-log__line ${logLevelClass(entry.level)}`}
                                      >
                                        <span className="admin-job-log__time">{formatTime(entry.at)}</span>
                                        <span className="admin-job-log__message">
                                          {entry.level === 'error'
                                            ? toSafeMessage(entry.message, 'An error occurred during this step.')
                                            : entry.message}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="admin-job-log__empty">
                                      No log entries recorded for this sync run.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length > 0 ? (
          <div className="admin-pagination">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={rows.length < pageSize}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
