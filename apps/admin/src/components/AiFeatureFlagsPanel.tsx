import { useEffect, useMemo, useState } from 'react';
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

type Draft = { enabled: boolean; rolloutPercentage: number };

export function AiFeatureFlagsPanel({ className }: { className?: string }) {
  const [rows, setRows] = useState<AdminFeatureFlagDefinition[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminFeatureFlags()
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
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save feature flag');
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading AI feature flags…</p>;
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

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

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
