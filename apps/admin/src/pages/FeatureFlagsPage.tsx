import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Button, cn } from '@cardwise/ui';

import { LoadErrorState } from '../components/feedback/LoadErrorState';
import { TableSkeleton } from '../components/feedback/PageSkeleton';
import {
  fetchAdminFeatureFlags,
  updateAdminFeatureFlag,
  type AdminFeatureFlagDefinition,
} from '../lib/api';
import {
  AI_FEATURE_FLAG_KEYS,
  aiFeatureFlagLabel,
  AI_FEATURE_FLAG_HINTS,
  isAiFeatureFlagKey,
} from '../lib/ai-feature-flags';
import { notify, safeMessage } from '../lib/notify';

function formatKey(key: string): string {
  return key.replace(/_/g, ' ');
}

function FlagRow({
  row,
  draft,
  dirty,
  saving,
  onDraftChange,
  onSave,
  label,
  hint,
}: {
  row: AdminFeatureFlagDefinition;
  draft: { enabled: boolean; rolloutPercentage: number };
  dirty: boolean;
  saving: boolean;
  onDraftChange: (draft: { enabled: boolean; rolloutPercentage: number }) => void;
  onSave: () => void;
  label?: string;
  hint?: string;
}) {
  return (
    <tr className="border-t border-border/50">
      <td className="px-4 py-3">
        <p className="font-medium capitalize">{label ?? formatKey(row.key)}</p>
        <p className="text-xs text-muted-foreground">{row.key}</p>
        {isAiFeatureFlagKey(row.key) ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
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

function FlagTable({
  rows,
  drafts,
  dirtyKeys,
  savingKey,
  setDrafts,
  onSave,
}: {
  rows: AdminFeatureFlagDefinition[];
  drafts: Record<string, { enabled: boolean; rolloutPercentage: number }>;
  dirtyKeys: string[];
  savingKey: string | null;
  setDrafts: Dispatch<
    SetStateAction<Record<string, { enabled: boolean; rolloutPercentage: number }>>
  >;
  onSave: (key: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Flag</th>
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
              <FlagRow
                key={row.key}
                row={row}
                draft={draft}
                dirty={dirtyKeys.includes(row.key)}
                saving={savingKey === row.key}
                label={isAiFeatureFlagKey(row.key) ? aiFeatureFlagLabel(row.key) : undefined}
                hint={isAiFeatureFlagKey(row.key) ? AI_FEATURE_FLAG_HINTS[row.key] : undefined}
                onDraftChange={(next) => setDrafts((current) => ({ ...current, [row.key]: next }))}
                onSave={() => onSave(row.key)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function FeatureFlagsPage() {
  const [rows, setRows] = useState<AdminFeatureFlagDefinition[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { enabled: boolean; rolloutPercentage: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetchAdminFeatureFlags()
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
          safeMessage(err instanceof Error ? err.message : '', 'Failed to load feature flags.'),
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

  const { aiRows, otherRows } = useMemo(() => {
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const ai = AI_FEATURE_FLAG_KEYS.map((key) => byKey.get(key)).filter(
      (row): row is AdminFeatureFlagDefinition => row !== undefined,
    );
    const aiKeySet = new Set(AI_FEATURE_FLAG_KEYS);
    const other = rows.filter(
      (row) => !aiKeySet.has(row.key as (typeof AI_FEATURE_FLAG_KEYS)[number]),
    );
    return { aiRows: ai, otherRows: other };
  }, [rows]);

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
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Feature flags</h1>
        </div>
        <TableSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <LoadErrorState
        title="Could not load feature flags"
        description={error}
        onRetry={() => void load()}
      />
    );
  }

  const tableProps = {
    drafts,
    dirtyKeys,
    savingKey,
    setDrafts,
    onSave: (key: string) => void save(key),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Feature flags</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Enable features and control rollout percentage per user bucket. All flags are managed here
          — not via <code className="text-xs">.env</code>. Clients cache evaluated flags in
          localStorage.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">AI platform</h2>
          <p className="text-sm text-muted-foreground">
            Enable semantic search, assistant, explanations, and other AI capabilities. Start with{' '}
            <strong className="font-medium">Platform master</strong>, then turn on individual
            features.
          </p>
        </div>
        <FlagTable rows={aiRows} {...tableProps} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Product & rollout</h2>
          <p className="text-sm text-muted-foreground">Core product modules and experiments.</p>
        </div>
        <FlagTable rows={otherRows} {...tableProps} />
      </section>

      <p className={cn('text-xs text-muted-foreground')}>
        Tip: set rollout to 100% for full enablement, or use partial rollout for gradual release.
      </p>
    </div>
  );
}
