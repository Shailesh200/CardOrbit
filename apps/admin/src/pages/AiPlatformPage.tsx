import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@cardwise/ui';
import { Loader2, Sparkles } from 'lucide-react';

import {
  activateAiPrompt,
  createAiPrompt,
  getAiPlatformStatus,
  getAiRun,
  getAiRunSummary,
  getAiTaskRouting,
  listAiPrompts,
  listAiRuns,
  pingAiPlatform,
  updateAiPrompt,
  type AiPlatformStatus,
  type AiPromptVersionRow,
  type AiRunRow,
  type AiRunSummary,
  type AiTaskRoutingRow,
} from '../lib/api';
import { AiFeatureFlagsPanel } from '../components/AiFeatureFlagsPanel';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadErrorState } from '../components/feedback/LoadErrorState';
import { StatGridSkeleton, TableSkeleton } from '../components/feedback/PageSkeleton';
import { notify, safeMessage } from '../lib/notify';

type Tab = 'runs' | 'prompts' | 'routing';

const AI_FEATURES = [
  'ping',
  'catalog-structure',
  'reco-explain',
  'smart-insights',
  'ranking-signals',
  'merchant-enrichment',
  'offer-parsing',
  'admin-insights',
  'semantic-search',
  'assistant',
  'rag-answer',
] as const;

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
      }`}
    >
      {label}
    </span>
  );
}

export function AiPlatformPage() {
  const [tab, setTab] = useState<Tab>('runs');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [status, setStatus] = useState<AiPlatformStatus | null>(null);
  const [summary, setSummary] = useState<AiRunSummary | null>(null);
  const [routing, setRouting] = useState<AiTaskRoutingRow[]>([]);
  const [prompts, setPrompts] = useState<AiPromptVersionRow[]>([]);
  const [runs, setRuns] = useState<AiRunRow[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runFeatureFilter, setRunFeatureFilter] = useState('');
  const [runStatusFilter, setRunStatusFilter] = useState<'SUCCESS' | 'FAILURE' | ''>('');
  const [selectedRun, setSelectedRun] = useState<AiRunRow | null>(null);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AiPromptVersionRow | null>(null);
  const [promptForm, setPromptForm] = useState({
    feature: 'catalog-structure',
    version: '',
    systemPrompt: '',
    userTemplate: '',
    modelTier: 'fast' as 'fast' | 'quality' | 'ping',
    modelOverride: '',
    activate: false,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [statusData, summaryData, routingData, promptRows, runPage] = await Promise.all([
        getAiPlatformStatus(),
        getAiRunSummary(7),
        getAiTaskRouting(),
        listAiPrompts(),
        listAiRuns({
          feature: runFeatureFilter || undefined,
          status: runStatusFilter || undefined,
          limit: 50,
        }),
      ]);
      setStatus(statusData);
      setSummary(summaryData);
      setRouting(routingData.routes);
      setPrompts(promptRows);
      setRuns(runPage.items);
      setRunsTotal(runPage.total);
    } catch (error) {
      setLoadError(
        safeMessage(
          error instanceof Error ? error.message : '',
          'Failed to load the AI platform. Check your connection and try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [runFeatureFilter, runStatusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const promptsByFeature = useMemo(() => {
    const grouped = new Map<string, AiPromptVersionRow[]>();
    for (const row of prompts) {
      const list = grouped.get(row.feature) ?? [];
      list.push(row);
      grouped.set(row.feature, list);
    }
    return grouped;
  }, [prompts]);

  async function onPing() {
    setPinging(true);
    try {
      const result = await pingAiPlatform();
      notify.success(`Ping OK — ${result.model} (${result.latencyMs}ms)`);
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Ping failed. Check the AI provider configuration.');
    } finally {
      setPinging(false);
    }
  }

  async function openRunDetail(id: string) {
    try {
      const run = await getAiRun(id);
      setSelectedRun(run);
    } catch (error) {
      notify.fromError(error, 'Failed to load run details.');
    }
  }

  function openCreatePrompt(feature?: string) {
    setEditingPrompt(null);
    setPromptForm({
      feature: feature ?? 'catalog-structure',
      version: '',
      systemPrompt: '',
      userTemplate: '',
      modelTier: 'fast',
      modelOverride: '',
      activate: false,
    });
    setPromptDialogOpen(true);
  }

  function openEditPrompt(prompt: AiPromptVersionRow) {
    setEditingPrompt(prompt);
    setPromptForm({
      feature: prompt.feature,
      version: prompt.version,
      systemPrompt: prompt.systemPrompt,
      userTemplate: prompt.userTemplate ?? '',
      modelTier: (prompt.modelTier as 'fast' | 'quality' | 'ping') ?? 'fast',
      modelOverride: prompt.modelOverride ?? '',
      activate: false,
    });
    setPromptDialogOpen(true);
  }

  async function onSavePrompt(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingPrompt) {
        await updateAiPrompt(editingPrompt.id, {
          systemPrompt: promptForm.systemPrompt,
          userTemplate: promptForm.userTemplate || null,
          modelTier: promptForm.modelTier,
          modelOverride: promptForm.modelOverride || null,
        });
        notify.success('Prompt updated');
      } else {
        await createAiPrompt({
          feature: promptForm.feature,
          version: promptForm.version,
          systemPrompt: promptForm.systemPrompt,
          userTemplate: promptForm.userTemplate || undefined,
          modelTier: promptForm.modelTier,
          modelOverride: promptForm.modelOverride || undefined,
          activate: promptForm.activate,
        });
        notify.success('Prompt version created');
      }
      setPromptDialogOpen(false);
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Failed to save prompt. Please try again.');
    }
  }

  async function onActivatePrompt(id: string) {
    try {
      await activateAiPrompt(id);
      notify.success('Prompt activated');
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Failed to activate prompt. Please try again.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Platform</h1>
          <p className="text-sm text-muted-foreground">
            Run audit logs, prompt registry, and model routing (AI-002)
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => void onPing()}
            disabled={pinging || !status?.configured}
          >
            {pinging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ping Gemini
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <StatGridSkeleton />
          <TableSkeleton />
        </div>
      ) : loadError ? (
        <LoadErrorState
          title="Could not load the AI platform"
          description={loadError}
          onRetry={() => void refresh()}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Configuration</CardDescription>
                <CardTitle className="text-base">
                  {status?.configured ? 'Connected' : 'Not configured'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {status?.configured ? (
                  <>
                    <div>{status.provider}</div>
                    <div className="truncate">{status.defaultModel ?? status.fastModel}</div>
                  </>
                ) : (
                  'Set GEMINI_API_KEY in .env.local'
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Runs (7d)</CardDescription>
                <CardTitle className="text-base">{summary?.totalRuns ?? 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <span className="text-emerald-400">{summary?.successCount ?? 0} ok</span>
                {' · '}
                <span className="text-red-400">{summary?.failureCount ?? 0} failed</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tokens (7d)</CardDescription>
                <CardTitle className="text-base">
                  {(summary?.tokens.total ?? 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Avg latency {summary?.avgLatencyMs ?? 0}ms
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Platform flag</CardDescription>
                <CardTitle className="text-base">
                  <StatusBadge
                    ok={Boolean(status?.platformEnabled)}
                    label={status?.platformEnabled ? 'Enabled' : 'Disabled'}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Toggle in Admin → Feature flags
              </CardContent>
            </Card>
          </div>

          {status?.configured ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Env model defaults</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Fast:</span> {status.fastModel}
                </div>
                <div>
                  <span className="text-muted-foreground">Quality:</span> {status.qualityModel}
                </div>
                <div>
                  <span className="text-muted-foreground">Ping:</span> {status.pingModel}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex gap-2 border-b border-border pb-2">
            {(['runs', 'prompts', 'routing'] as Tab[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                  tab === item
                    ? 'bg-muted font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {tab === 'runs' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={runFeatureFilter}
                  onChange={(event) => setRunFeatureFilter(event.target.value)}
                >
                  <option value="">All features</option>
                  {AI_FEATURES.map((feature) => (
                    <option key={feature} value={feature}>
                      {feature}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={runStatusFilter}
                  onChange={(event) =>
                    setRunStatusFilter(event.target.value as 'SUCCESS' | 'FAILURE' | '')
                  }
                >
                  <option value="">All statuses</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Feature</th>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Tokens</th>
                      <th className="px-3 py-2">Latency</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr
                        key={run.id}
                        className="cursor-pointer border-t border-border hover:bg-muted/30"
                        onClick={() => void openRunDetail(run.id)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(run.createdAt)}</td>
                        <td className="px-3 py-2">{run.feature}</td>
                        <td className="px-3 py-2 font-mono text-xs">{run.model}</td>
                        <td className="px-3 py-2">{run.totalTokens ?? '—'}</td>
                        <td className="px-3 py-2">{run.latencyMs}ms</td>
                        <td className="px-3 py-2">
                          <StatusBadge ok={run.status === 'SUCCESS'} label={run.status} />
                        </td>
                      </tr>
                    ))}
                    {runs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                          No AI runs yet — use Ping or ai:poc CLI
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {runs.length} of {runsTotal} runs
              </p>
            </div>
          ) : null}

          {tab === 'prompts' ? (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button type="button" onClick={() => openCreatePrompt()}>
                  New prompt version
                </Button>
              </div>
              {prompts.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No prompt versions yet"
                  description="Create the first prompt version for a feature above."
                />
              ) : null}
              {AI_FEATURES.map((feature) => {
                const rows = promptsByFeature.get(feature) ?? [];
                if (rows.length === 0) return null;
                return (
                  <Card key={feature}>
                    <CardHeader>
                      <CardTitle className="text-base">{feature}</CardTitle>
                      <CardDescription>{rows.length} version(s)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rows.map((prompt) => (
                        <div
                          key={prompt.id}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{prompt.version}</span>
                              {prompt.isActive ? (
                                <StatusBadge ok label="Active" />
                              ) : (
                                <StatusBadge ok={false} label="Inactive" />
                              )}
                              {prompt.modelTier ? (
                                <span className="text-xs text-muted-foreground">
                                  tier: {prompt.modelTier}
                                </span>
                              ) : null}
                              {prompt.modelOverride ? (
                                <span className="font-mono text-xs text-muted-foreground">
                                  override: {prompt.modelOverride}
                                </span>
                              ) : null}
                            </div>
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {prompt.systemPrompt}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEditPrompt(prompt)}
                            >
                              Edit
                            </Button>
                            {!prompt.isActive ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void onActivatePrompt(prompt.id)}
                              >
                                Activate
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}

          {tab === 'routing' ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Feature</th>
                    <th className="px-3 py-2">Active prompt</th>
                    <th className="px-3 py-2">Tier</th>
                    <th className="px-3 py-2">Env default</th>
                    <th className="px-3 py-2">Override</th>
                    <th className="px-3 py-2">Effective model</th>
                  </tr>
                </thead>
                <tbody>
                  {routing.map((row) => (
                    <tr key={row.feature} className="border-t border-border">
                      <td className="px-3 py-2">{row.feature}</td>
                      <td className="px-3 py-2">{row.activeVersion ?? '—'}</td>
                      <td className="px-3 py-2">{row.modelTier}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.envDefaultModel}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.modelOverride ?? '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.effectiveModel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}

      <AiFeatureFlagsPanel />

      <Dialog open={Boolean(selectedRun)} onOpenChange={(open) => !open && setSelectedRun(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI run detail</DialogTitle>
            <DialogDescription>{selectedRun?.id}</DialogDescription>
          </DialogHeader>
          {selectedRun ? (
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Feature</dt>
                <dd>{selectedRun.feature}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Prompt version</dt>
                <dd>{selectedRun.promptVersion ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-mono text-xs">{selectedRun.model}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Provider</dt>
                <dd>{selectedRun.provider}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tokens</dt>
                <dd>
                  in {selectedRun.inputTokens ?? '—'} / out {selectedRun.outputTokens ?? '—'} /
                  total {selectedRun.totalTokens ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Latency</dt>
                <dd>{selectedRun.latencyMs}ms</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Triggered by</dt>
                <dd>{selectedRun.triggeredBy ?? '—'}</dd>
              </div>
              {selectedRun.errorMessage ? (
                <div>
                  <dt className="text-muted-foreground">Error</dt>
                  <dd className="text-red-700">{selectedRun.errorMessage}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <form onSubmit={onSavePrompt}>
            <DialogHeader>
              <DialogTitle>{editingPrompt ? 'Edit prompt' : 'New prompt version'}</DialogTitle>
              <DialogDescription>
                Prompts are versioned per feature. Activate to use for routing (AI-003+).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {!editingPrompt ? (
                <>
                  <label className="grid gap-1 text-sm">
                    Feature
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2"
                      value={promptForm.feature}
                      onChange={(event) =>
                        setPromptForm((prev) => ({ ...prev, feature: event.target.value }))
                      }
                    >
                      {AI_FEATURES.map((feature) => (
                        <option key={feature} value={feature}>
                          {feature}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    Version
                    <Input
                      value={promptForm.version}
                      onChange={(event) =>
                        setPromptForm((prev) => ({ ...prev, version: event.target.value }))
                      }
                      placeholder="v1.1.0"
                      required
                    />
                  </label>
                </>
              ) : null}
              <label className="grid gap-1 text-sm">
                System prompt
                <textarea
                  className="min-h-40 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                  value={promptForm.systemPrompt}
                  onChange={(event) =>
                    setPromptForm((prev) => ({ ...prev, systemPrompt: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                User template (optional)
                <textarea
                  className="min-h-20 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                  value={promptForm.userTemplate}
                  onChange={(event) =>
                    setPromptForm((prev) => ({ ...prev, userTemplate: event.target.value }))
                  }
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Model tier
                  <select
                    className="rounded-md border border-border bg-background px-3 py-2"
                    value={promptForm.modelTier}
                    onChange={(event) =>
                      setPromptForm((prev) => ({
                        ...prev,
                        modelTier: event.target.value as 'fast' | 'quality' | 'ping',
                      }))
                    }
                  >
                    <option value="fast">fast</option>
                    <option value="quality">quality</option>
                    <option value="ping">ping</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Model override (optional)
                  <Input
                    value={promptForm.modelOverride}
                    onChange={(event) =>
                      setPromptForm((prev) => ({ ...prev, modelOverride: event.target.value }))
                    }
                    placeholder="anthropic/claude-haiku"
                  />
                </label>
              </div>
              {!editingPrompt ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={promptForm.activate}
                    onChange={(event) =>
                      setPromptForm((prev) => ({ ...prev, activate: event.target.checked }))
                    }
                  />
                  Activate immediately
                </label>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromptDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
