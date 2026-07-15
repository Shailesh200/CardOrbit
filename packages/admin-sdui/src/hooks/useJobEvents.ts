import { useEffect, useRef, useState } from 'react';

import type { JobProgressEvent } from '../types';

export type JobRunSummary = {
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

export function useJobEvents(
  jobId: string | null,
  options: {
    fetchJob: (id: string) => Promise<JobRunSummary>;
    apiBase?: string;
    getToken?: () => string | null;
  },
) {
  const [job, setJob] = useState<JobRunSummary | null>(null);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    let cancelled = false;

    void options.fetchJob(jobId).then((row) => {
      if (!cancelled) setJob(row);
    });

    const base = options.apiBase ?? '';
    const token = options.getToken?.();
    const url = `${base}/api/v1/admin/jobs/${jobId}/events${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as JobProgressEvent;
        setJob((prev) => ({
          ...(prev ?? { id: jobId, status: payload.status }),
          id: jobId,
          status: payload.status,
          progress: payload.progress ?? prev?.progress,
          result: payload.result ?? prev?.result,
          errorMessage: payload.errorMessage ?? prev?.errorMessage,
          type: prev?.type,
          payload: prev?.payload,
          estimatedMinutes: prev?.estimatedMinutes,
        }));
        if (payload.status === 'COMPLETED' || payload.status === 'FAILED') {
          source.close();
          setConnected(false);
        }
      } catch {
        // ignore malformed events
      }
    };

    return () => {
      cancelled = true;
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [jobId, options.apiBase, options.fetchJob, options.getToken]);

  return { job, connected };
}
