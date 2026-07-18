import type { SduiBlock, SduiField } from '@cardwise/admin-config';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  toast,
} from '@cardwise/ui';
import { AlertTriangle } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { toSafeMessage } from '../lib/sanitize-message';
import type { SduiActionContext, SduiCustomBlocks } from '../types';
import { JobStatusBlock } from './job-status';
import { SyncHistoryBlock } from './sync-history';

function BlockLoadError({
  description,
  onRetry,
}: {
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="admin-error-state" role="alert">
      <AlertTriangle className="admin-error-state__icon" aria-hidden />
      <div className="admin-error-state__copy">
        <p className="admin-error-state__title">Could not load this section</p>
        <p className="admin-error-state__desc">{description}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function resolveOptions(field: SduiField, ctx: SduiActionContext) {
  if (field.kind !== 'select') return [];
  return ctx.optionSources[field.optionsSource] ?? [];
}

function HeroBlock({ block }: { block: Extract<SduiBlock, { type: 'hero' }> }) {
  return (
    <header className="admin-hero animate-admin-enter">
      <h1 className="admin-hero__title">{block.title}</h1>
      {block.description ? <p className="admin-hero__desc">{block.description}</p> : null}
    </header>
  );
}

function JobLauncherBlock({
  block,
  ctx,
}: {
  block: Extract<SduiBlock, { type: 'job-launcher' }>;
  ctx: SduiActionContext;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({ purgePending: true });
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const type = String(values.type ?? '');
    if (!type) {
      toast.error('Select a job type');
      return;
    }
    setBusy(true);
    try {
      const { bankSlug, purgePending, limit, ...rest } = values;
      const payload: Record<string, unknown> = { ...rest };
      if (bankSlug) payload.bankSlug = bankSlug;
      if (type === 'catalog.ai-ingest') {
        payload.purgePending = purgePending !== false;
        if (limit) payload.limit = Number(limit);
      }
      const result = await ctx.enqueueJob(type, payload);
      ctx.setActiveJobId(result.id);
      toast.success(result.message ?? 'Job queued');
    } catch (error) {
      toast.error(toSafeMessage(error instanceof Error ? error.message : '', 'Failed to start job. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="admin-panel">
      <CardHeader>
        <CardTitle className="font-display text-xl">Start background sync</CardTitle>
        <CardDescription>Select parameters — sync continues if you navigate away.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="admin-form-grid" onSubmit={onSubmit}>
          {block.fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={values[field.name]}
              options={resolveOptions(field, ctx)}
              onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
            />
          ))}
          <div className="admin-form-actions">
            <Button type="submit" className="btn-premium" disabled={busy}>
              {busy ? 'Starting…' : (block.submitLabel ?? 'Submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldControl({
  field,
  value,
  options,
  onChange,
}: {
  field: SduiField;
  value: unknown;
  options: Array<{ value: string; label: string }>;
  onChange: (value: unknown) => void;
}) {
  const id = `field-${field.name}`;

  if (field.kind === 'boolean') {
    return (
      <div className="admin-field admin-field--checkbox">
        <Checkbox
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <div>
          <Label htmlFor={id}>{field.label}</Label>
          {field.description ? <p className="admin-field__hint">{field.description}</p> : null}
        </div>
      </div>
    );
  }

  if (field.kind === 'select') {
    return (
      <div className="admin-field">
        <Label htmlFor={id}>{field.label}</Label>
        <select
          id={id}
          className="admin-select"
          required={field.required}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <div className="admin-field admin-field--full">
        <Label htmlFor={id}>{field.label}</Label>
        <textarea
          id={id}
          className="admin-textarea"
          rows={field.rows ?? 4}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="admin-field">
      <Label htmlFor={id}>{field.label}</Label>
      <Input
        id={id}
        type={field.kind === 'number' ? 'number' : 'text'}
        required={field.required}
        placeholder={field.kind === 'text' ? field.placeholder : undefined}
        min={field.kind === 'number' ? field.min : undefined}
        max={field.kind === 'number' ? field.max : undefined}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) =>
          onChange(field.kind === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)
        }
      />
    </div>
  );
}

function StatsBlock({
  block,
  ctx,
}: {
  block: Extract<SduiBlock, { type: 'stats' }>;
  ctx: SduiActionContext;
}) {
  const [stats, setStats] = useState<Array<{ label: string; value: string | number }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void ctx
      .fetchData(block.dataSource)
      .then((data) => {
        const row = data as Record<string, unknown>;
        if (row.stats && Array.isArray(row.stats)) {
          setStats(row.stats as Array<{ label: string; value: string | number }>);
        }
      })
      .catch((error: unknown) => {
        setLoadError(toSafeMessage(error instanceof Error ? error.message : '', 'Failed to load stats.'));
      })
      .finally(() => setLoading(false));
  }, [block.dataSource, ctx]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="admin-stat-grid" aria-busy="true" aria-label="Loading stats">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="admin-panel admin-stat">
            <CardContent className="pt-6">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-6 w-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (loadError) {
    return <BlockLoadError description={loadError} onRetry={load} />;
  }

  return (
    <div className="admin-stat-grid">
      {stats.map((stat) => (
        <Card key={stat.label} className="admin-panel admin-stat">
          <CardContent className="pt-6">
            <p className="admin-stat__label">{stat.label}</p>
            <p className="admin-stat__value">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DataTableBlock({
  block,
  ctx,
}: {
  block: Extract<SduiBlock, { type: 'data-table' }>;
  ctx: SduiActionContext;
}) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const title = block.title ?? block.columns.map((col) => col.label).slice(0, 2).join(' · ');

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void ctx
      .fetchData(block.dataSource, { limit: pageSize, offset: page * pageSize })
      .then((data) => {
        const payload = data as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>;
        setRows(Array.isArray(payload) ? payload : (payload.items ?? []));
      })
      .catch((error: unknown) => {
        setLoadError(toSafeMessage(error instanceof Error ? error.message : '', 'Failed to load records.'));
      })
      .finally(() => setLoading(false));
  }, [block.dataSource, ctx, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="admin-panel">
      <CardHeader>
        <CardTitle className="font-display text-xl">{title}</CardTitle>
        {block.description ? <CardDescription>{block.description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="admin-loading" role="status" aria-live="polite">
            <span className="admin-loading__dot" />
            <span className="admin-loading__dot" />
            <span className="admin-loading__dot" />
            Loading records…
          </div>
        ) : loadError ? (
          <BlockLoadError description={loadError} onRetry={load} />
        ) : rows.length === 0 ? (
          <p className="admin-empty">No records yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {block.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  {block.actions?.length ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    {block.columns.map((col) => (
                      <td key={col.key}>{formatCell(row[col.key], col.format)}</td>
                    ))}
                    {block.actions?.length ? (
                      <td className="admin-table__actions">
                        {block.actions.map((action) => (
                          <Button
                            key={action.id}
                            type="button"
                            size="sm"
                            variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                            onClick={() => void handleRowAction(action.id, row, ctx)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length > 0 && block.pagination ? (
          <div className="admin-pagination">
            <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button type="button" variant="outline" size="sm" disabled={rows.length < pageSize} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function handleRowAction(actionId: string, row: Record<string, unknown>, ctx: SduiActionContext) {
  const id = String(row.id ?? '');
  if (!id) return;
  if (actionId === 'delete' && !confirm('Delete this user? Dev-only.')) return;
  if (actionId === 'archive' && !confirm('Archive this card?')) return;
  try {
    await ctx.submitAction(`admin.row.${actionId}`, { id, row });
    toast.success('Done');
  } catch (error) {
    toast.error(toSafeMessage(error instanceof Error ? error.message : '', 'Action failed. Please try again.'));
  }
}

function formatCell(value: unknown, format?: string) {
  if (value == null) return '—';
  if (format === 'badge') return <Badge variant="secondary">{String(value)}</Badge>;
  if (format === 'date') return new Date(String(value)).toLocaleString('en-IN');
  if (format === 'percent') return `${value}%`;
  if (format === 'currency') return `₹${value}`;
  return String(value);
}

function FormBlock({
  block,
  ctx,
}: {
  block: Extract<SduiBlock, { type: 'form' }>;
  ctx: SduiActionContext;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await ctx.submitAction(block.submitAction, values);
      toast.success('Saved');
      setValues({});
    } catch (error) {
      toast.error(toSafeMessage(error instanceof Error ? error.message : '', 'Submit failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="admin-panel">
      <CardHeader>
        <CardTitle className="font-display text-xl">{block.submitLabel ?? 'Form'}</CardTitle>
        {block.description ? <CardDescription>{block.description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <form className="admin-form-grid" onSubmit={onSubmit}>
          {block.fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={values[field.name]}
              options={resolveOptions(field, ctx)}
              onChange={(value) => setValues((prev) => ({ ...prev, [field.name]: value }))}
            />
          ))}
          <div className="admin-form-actions">
            <Button type="submit" className="btn-premium" disabled={busy}>
              {block.submitLabel ?? 'Submit'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function InsightGridBlock({
  block,
  ctx,
}: {
  block: Extract<SduiBlock, { type: 'insight-grid' }>;
  ctx: SduiActionContext;
}) {
  const [sections, setSections] = useState<Array<{ title: string; metrics: Array<{ label: string; value: string; hint?: string }> }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void ctx
      .fetchData(block.dataSource)
      .then((data) => {
        const payload = data as { sections?: typeof sections };
        setSections(payload.sections ?? []);
      })
      .catch((error: unknown) => {
        setLoadError(toSafeMessage(error instanceof Error ? error.message : '', 'Failed to load insights.'));
      })
      .finally(() => setLoading(false));
  }, [block.dataSource, ctx]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="admin-loading" role="status">
        <span className="admin-loading__dot" />
        <span className="admin-loading__dot" />
        <span className="admin-loading__dot" />
        Loading insights…
      </div>
    );
  }

  if (loadError) {
    return <BlockLoadError description={loadError} onRetry={load} />;
  }

  if (sections.length === 0) {
    return <p className="admin-empty">No insights available yet.</p>;
  }

  return (
    <div className="admin-insight-grid">
      {sections.map((section) => (
        <Card key={section.title} className="admin-panel">
          <CardHeader>
            <CardTitle className="font-display text-xl">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.metrics.map((metric) => (
              <div key={metric.label} className="admin-metric">
                <p className="admin-metric__label">{metric.label}</p>
                <p className="admin-metric__value">{metric.value}</p>
                {metric.hint ? <p className="admin-metric__hint">{metric.hint}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RuleTemplatesBlock({
  block,
  ctx,
}: {
  block: Extract<SduiBlock, { type: 'rule-templates' }>;
  ctx: SduiActionContext;
}) {
  const [templates, setTemplates] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void ctx
      .fetchData(block.dataSource)
      .then((data) => {
        const payload = data as { templates?: Array<Record<string, unknown>> };
        setTemplates(payload.templates ?? []);
      })
      .catch((error: unknown) => {
        setLoadError(toSafeMessage(error instanceof Error ? error.message : '', 'Failed to load rule templates.'));
      })
      .finally(() => setLoading(false));
  }, [block.dataSource, ctx]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="admin-loading" role="status">
        <span className="admin-loading__dot" />
        <span className="admin-loading__dot" />
        <span className="admin-loading__dot" />
        Loading templates…
      </div>
    );
  }

  if (loadError) {
    return <BlockLoadError description={loadError} onRetry={load} />;
  }

  if (templates.length === 0) {
    return <p className="admin-empty">No rule templates configured.</p>;
  }

  return (
    <div className="admin-template-grid">
      {templates.map((template) => (
        <Card key={String(template.id)} className="admin-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{String(template.name)}</CardTitle>
              {template.requiredForDecision ? <Badge>Required</Badge> : null}
            </div>
            <CardDescription>{String(template.description)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{String(template.category)} · {String(template.entityType)}</p>
            <pre className="admin-code mt-3">{JSON.stringify(template.payloadTemplate, null, 2)}</pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TabsBlock({
  block,
  ctx,
  customBlocks,
  fetchJob,
  listActiveJobs,
  cancelJob,
  apiBase,
  getToken,
}: {
  block: Extract<SduiBlock, { type: 'tabs' }>;
  ctx: SduiActionContext;
  customBlocks?: SduiCustomBlocks;
  fetchJob: JobStatusBlockProps['fetchJob'];
  listActiveJobs?: JobStatusBlockProps['listActiveJobs'];
  cancelJob?: JobStatusBlockProps['cancelJob'];
  apiBase?: string;
  getToken?: () => string | null;
}) {
  const [active, setActive] = useState(block.tabs[0]?.id ?? '');
  const tab = block.tabs.find((t) => t.id === active) ?? block.tabs[0];

  return (
    <div className="admin-tabs">
      <div className="admin-tabs__list" role="tablist">
        {block.tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            className={t.id === active ? 'is-active' : undefined}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Card className="admin-panel admin-tabs__panel">
        <CardContent className="pt-6">
          {tab ? (
            <SduiBlockList
              blocks={tab.blocks}
              ctx={ctx}
              customBlocks={customBlocks}
              fetchJob={fetchJob}
              listActiveJobs={listActiveJobs}
              cancelJob={cancelJob}
              apiBase={apiBase}
              getToken={getToken}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

type JobStatusBlockProps = Parameters<typeof JobStatusBlock>[0];

function SduiBlockList({
  blocks,
  ctx,
  customBlocks,
  fetchJob,
  listActiveJobs,
  cancelJob,
  apiBase,
  getToken,
}: {
  blocks: SduiBlock[];
  ctx: SduiActionContext;
  customBlocks?: SduiCustomBlocks;
  fetchJob: JobStatusBlockProps['fetchJob'];
  listActiveJobs?: JobStatusBlockProps['listActiveJobs'];
  cancelJob?: JobStatusBlockProps['cancelJob'];
  apiBase?: string;
  getToken?: () => string | null;
}) {
  return (
    <div className="admin-blocks">
      {blocks.map((block, index) => (
        <SduiBlockView
          key={`${block.type}-${index}`}
          block={block}
          ctx={ctx}
          customBlocks={customBlocks}
          fetchJob={fetchJob}
          listActiveJobs={listActiveJobs}
          cancelJob={cancelJob}
          apiBase={apiBase}
          getToken={getToken}
        />
      ))}
    </div>
  );
}

function SduiBlockView({
  block,
  ctx,
  customBlocks,
  fetchJob,
  listActiveJobs,
  cancelJob,
  apiBase,
  getToken,
}: {
  block: SduiBlock;
  ctx: SduiActionContext;
  customBlocks?: SduiCustomBlocks;
  fetchJob: JobStatusBlockProps['fetchJob'];
  listActiveJobs?: JobStatusBlockProps['listActiveJobs'];
  cancelJob?: JobStatusBlockProps['cancelJob'];
  apiBase?: string;
  getToken?: () => string | null;
}) {
  switch (block.type) {
    case 'hero':
      return <HeroBlock block={block} />;
    case 'job-launcher':
      return <JobLauncherBlock block={block} ctx={ctx} />;
    case 'job-status':
      return (
        <JobStatusBlock
          ctx={ctx}
          fetchJob={fetchJob}
          listActiveJobs={listActiveJobs}
          cancelJob={cancelJob}
          apiBase={apiBase}
          getToken={getToken}
        />
      );
    case 'sync-history':
      return <SyncHistoryBlock ctx={ctx} fetchJob={fetchJob} columns={block.columns} />;
    case 'stats':
      return <StatsBlock block={block} ctx={ctx} />;
    case 'data-table':
      return <DataTableBlock block={block} ctx={ctx} />;
    case 'form':
      return <FormBlock block={block} ctx={ctx} />;
    case 'insight-grid':
      return <InsightGridBlock block={block} ctx={ctx} />;
    case 'rule-templates':
      return <RuleTemplatesBlock block={block} ctx={ctx} />;
    case 'tabs':
      return (
        <TabsBlock
          block={block}
          ctx={ctx}
          customBlocks={customBlocks}
          fetchJob={fetchJob}
          listActiveJobs={listActiveJobs}
          cancelJob={cancelJob}
          apiBase={apiBase}
          getToken={getToken}
        />
      );
    case 'import-queue': {
      const ImportQueue = customBlocks?.['import-queue'];
      return ImportQueue ? <ImportQueue block={block} ctx={ctx} /> : null;
    }
    case 'asset-manager': {
      const AssetManager = customBlocks?.['asset-manager'];
      return AssetManager ? <AssetManager block={block} ctx={ctx} /> : null;
    }
    default:
      return null;
  }
}

export function SduiPageRenderer({
  blocks,
  ctx,
  customBlocks,
  fetchJob,
  listActiveJobs,
  cancelJob,
  apiBase,
  getToken,
}: {
  blocks: SduiBlock[];
  ctx: SduiActionContext;
  customBlocks?: SduiCustomBlocks;
  fetchJob: JobStatusBlockProps['fetchJob'];
  listActiveJobs?: JobStatusBlockProps['listActiveJobs'];
  cancelJob?: JobStatusBlockProps['cancelJob'];
  apiBase?: string;
  getToken?: () => string | null;
}) {
  const stableCtx = useMemo(() => ctx, [ctx]);
  return (
    <SduiBlockList
      blocks={blocks}
      ctx={stableCtx}
      customBlocks={customBlocks}
      fetchJob={fetchJob}
      listActiveJobs={listActiveJobs}
      cancelJob={cancelJob}
      apiBase={apiBase}
      getToken={getToken}
    />
  );
}
