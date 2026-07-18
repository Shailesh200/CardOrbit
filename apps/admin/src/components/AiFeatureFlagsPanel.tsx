import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, cn } from '@cardwise/ui';

import {
  fetchAdminFeatureFlags,
  updateAdminFeatureFlag,
  type AdminFeatureFlagDefinition,
} from '../lib/api';
import {
  AI_FEATURE_FLAG_KEYS,
  AI_FEATURE_FLAG_HINTS,
  aiFeatureFlagLabel,
  isAiFeatureFlagKey,
} from '../lib/ai-feature-flags';
import { LoadErrorState } from './feedback/LoadErrorState';
import { TableSkeleton } from './feedback/PageSkeleton';
import { notify, safeMessage } from '../lib/notify';

type Draft = { enabled: boolean; rolloutPercentage: number };

export function AiFeatureFlagsPanel({ className }: { className?: string }) {
  const [rows, setRows] = useState<AdminFeatureFlagDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchAdminFeatureFlags()
      .then((definitions) => {
        const aiRows = AI_FEATURE_FLAG_KEYS.map(
          (key) => definitions.find((row) => row.key === key) ?? null,
        ).filter((row): row is AdminFeatureFlagDefinition => row !== null);
        setRows(aiRows);
        setDrafts(
          Object.fromEntries(
            aiRows.map((row) => [
              row.key,
              { enabled: row.enabled, rolloutPercentage: row.rolloutPercentage },
            ]),
          ),
        );
      })
      .catch((err: unknown) => {
        setError(
          safeMessage(err instanceof Error ? err.message : '', 'Failed to load AI feature flags.'),
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirtyKeys = useMemo(() => {
    return rows
      .filter((row) => {
        const draft = drafts[row.key];
        if (!draft) return false;
        return draft.enabled !== row.enabled || draft.rolloutPercentage !== row.rolloutPercentage;
      })
      .map((row) => row.key);
  }, [drafts, rows]);

  async function save(key: string) {
    const draft = drafts[key];
    if (!draft) return;
    setSavingKey(key);
    setError(null);
    try {
      const updated = await updateAdminFeatureFlag(key, draft);
      setRows((current) => current.map((row) => (row.key === key ? updated : row)));
      notify.success(`${aiFeatureFlagLabel(key)} updated`);
    } catch (err) {
      notify.fromError(err, 'Failed to save feature flag. Please try again.');
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div>
          <h2 className="text-base font-semibold">AI feature flags</h2>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className={className}>
        <LoadErrorState
          title="Could not load AI feature flags"
          description={error}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-base font-semibold">AI feature flags</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Toggle AI capabilities for all users via the admin portal. Changes apply to API, web, and
          worker within ~30 seconds.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Flag</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Rollout</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.key] ?? {
                enabled: row.enabled,
                rolloutPercentage: row.rolloutPercentage,
              };
              const dirty = dirtyKeys.includes(row.key);
              return (
                <tr key={row.key} className="border-t border-border/50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{aiFeatureFlagLabel(row.key)}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.key}</p>
                    {isAiFeatureFlagKey(row.key) ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {AI_FEATURE_FLAG_HINTS[row.key]}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [row.key]: { ...draft, enabled: event.target.checked },
                          }))
                        }
                      />
                      <span>{draft.enabled ? 'On' : 'Off'}</span>
                    </label>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={draft.rolloutPercentage}
                        disabled={!draft.enabled}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [row.key]: {
                              ...draft,
                              rolloutPercentage: Number(event.target.value),
                            },
                          }))
                        }
                      />
                      <span className="w-10 text-right tabular-nums">
                        {draft.rolloutPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <Button
                      type="button"
                      size="sm"
                      variant={dirty ? 'default' : 'outline'}
                      disabled={!dirty || savingKey === row.key}
                      onClick={() => void save(row.key)}
                    >
                      {savingKey === row.key ? 'Saving…' : 'Save'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
