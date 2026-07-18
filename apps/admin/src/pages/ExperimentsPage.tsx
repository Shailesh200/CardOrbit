import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@cardwise/ui';

import { LoadErrorState } from '../components/feedback/LoadErrorState';
import { TableSkeleton } from '../components/feedback/PageSkeleton';
import {
  fetchAdminExperiments,
  updateAdminExperiment,
  type AdminExperimentDefinition,
} from '../lib/api';
import { notify, safeMessage } from '../lib/notify';

function ExperimentRow({
  row,
  draft,
  dirty,
  saving,
  onDraftChange,
  onSave,
}: {
  row: AdminExperimentDefinition;
  draft: { enabled: boolean; rolloutPercentage: number };
  dirty: boolean;
  saving: boolean;
  onDraftChange: (draft: { enabled: boolean; rolloutPercentage: number }) => void;
  onSave: () => void;
}) {
  return (
    <tr className="border-t border-border/50 align-top">
      <td className="px-4 py-3">
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.key}</p>
        {row.description ? (
          <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Variants: {row.variants.join(' · ')} · default{' '}
          <code className="text-[11px]">{row.defaultVariant}</code>
        </p>
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => onDraftChange({ ...draft, enabled: event.target.checked })}
          />
          <span>{draft.enabled ? 'On' : 'Off'}</span>
        </label>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draft.rolloutPercentage}
            disabled={!draft.enabled}
            onChange={(event) =>
              onDraftChange({ ...draft, rolloutPercentage: Number(event.target.value) })
            }
          />
          <span className="w-10 text-right tabular-nums">{draft.rolloutPercentage}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(row.updatedAt).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          type="button"
          size="sm"
          variant={dirty ? 'default' : 'outline'}
          disabled={!dirty || saving}
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </td>
    </tr>
  );
}

export function ExperimentsPage() {
  const [rows, setRows] = useState<AdminExperimentDefinition[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { enabled: boolean; rolloutPercentage: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchAdminExperiments()
      .then((definitions) => {
        setRows(definitions);
        setDrafts(
          Object.fromEntries(
            definitions.map((row) => [
              row.key,
              { enabled: row.enabled, rolloutPercentage: row.rolloutPercentage },
            ]),
          ),
        );
      })
      .catch((err: unknown) => {
        setError(
          safeMessage(err instanceof Error ? err.message : '', 'Failed to load experiments.'),
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
      const updated = await updateAdminExperiment(key, draft);
      setRows((current) => current.map((row) => (row.key === key ? updated : row)));
      notify.success(`${updated.name} updated`);
    } catch (err) {
      notify.fromError(err, 'Failed to save experiment. Please try again.');
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">A/B experiments</h1>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <LoadErrorState
        title="Could not load experiments"
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">A/B experiments</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Control variant assignment and rollout for measurable UX changes. Assignments are stable
          per user and exposed via <code className="text-xs">EXPERIMENT_EXPOSED</code> analytics
          events.
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
              <th className="px-4 py-3">Experiment</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Rollout</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.key] ?? {
                enabled: row.enabled,
                rolloutPercentage: row.rolloutPercentage,
              };
              return (
                <ExperimentRow
                  key={row.key}
                  row={row}
                  draft={draft}
                  dirty={dirtyKeys.includes(row.key)}
                  saving={savingKey === row.key}
                  onDraftChange={(next) =>
                    setDrafts((current) => ({ ...current, [row.key]: next }))
                  }
                  onSave={() => void save(row.key)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
