import { useCallback, useEffect, useState } from 'react';
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
} from '@cardwise/ui';
import { ExternalLink } from 'lucide-react';

import { LoadErrorState } from '../components/feedback/LoadErrorState';
import { PageHeroSkeleton, TableSkeleton } from '../components/feedback/PageSkeleton';
import {
  approveAllPendingCatalogItems,
  approveCatalogImportItem,
  getCatalogImportItem,
  getCatalogImportStats,
  listCatalogImportItems,
  publishAllApprovedCatalogItems,
  publishCatalogImportBatch,
  publishCatalogImportItem,
  rejectCatalogImportItem,
  type CatalogImportItem,
} from '../lib/api';
import { notify, safeMessage } from '../lib/notify';

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PUBLISHED: 'Published',
};

const HIGHLIGHT_CATEGORY_LABEL: Record<string, string> = {
  FEES: 'Fees & charges',
  REWARDS: 'Rewards',
  LOUNGE: 'Lounge access',
  INSURANCE: 'Insurance & protection',
  FUEL: 'Fuel',
  DINING: 'Dining',
  TRAVEL: 'Travel',
  SHOPPING: 'Shopping & offers',
  WELCOME: 'Welcome offers',
  CASHBACK: 'Cashback',
  ENTERTAINMENT: 'Entertainment',
  EMI: 'EMI & interest',
  APPROVAL: 'How to apply',
  ELIGIBILITY: 'Eligibility',
};

const HIGHLIGHT_DISPLAY_ORDER = [
  'FEES',
  'REWARDS',
  'WELCOME',
  'CASHBACK',
  'LOUNGE',
  'TRAVEL',
  'FUEL',
  'DINING',
  'ENTERTAINMENT',
  'EMI',
  'INSURANCE',
  'SHOPPING',
  'ELIGIBILITY',
  'APPROVAL',
];

type CardBundlePayload = {
  name?: string;
  slug?: string;
  bankSlug?: string;
  networkCode?: string;
  tier?: string;
  annualFeeInr?: number | null;
  joiningFeeInr?: number | null;
  sourceUrl?: string;
  tags?: string[];
  structuredFees?: Array<{ feeKind: string; label: string; value: string }>;
  highlights?: Array<{ category: string; title: string; description?: string | null }>;
  approvalSummary?: string | null;
  eligibilitySummary?: string | null;
  crawlDescription?: string | null;
  feesSummary?: string | null;
  benefits?: Array<{ benefitTypeCode: string; title: string; description?: string | null }>;
  rewardRules?: Array<{
    ruleKey: string;
    name: string;
    payload?: { rewardMultiplier?: number; cashbackPercent?: number };
  }>;
  sourceDocuments?: Array<{ url: string; label?: string | null; kind: string }>;
};

const SOURCE_DOCUMENT_KIND_LABEL: Record<string, string> = {
  MITC: 'Most Important T&C (MITC)',
  TNC: 'Terms & Conditions',
  KFS: 'Key Fact Statement',
  SCHEDULE_OF_CHARGES: 'Schedule of charges',
  PDF: 'PDF document',
  OTHER: 'Linked document',
};

type ImportPayloadEnvelope = {
  bundle?: CardBundlePayload;
  ingestMeta?: {
    method: 'ai' | 'crawl' | 'ai+fallback' | 'fallback';
    model?: string;
    promptVersion?: string;
    latencyMs?: number;
    fallbackBundle?: CardBundlePayload;
  };
};

function unwrapImportPayload(payload: unknown): {
  bundle: CardBundlePayload | null;
  ingestMeta: ImportPayloadEnvelope['ingestMeta'] | null;
} {
  if (!payload || typeof payload !== 'object') {
    return { bundle: null, ingestMeta: null };
  }
  if ('bundle' in payload) {
    const envelope = payload as ImportPayloadEnvelope;
    return {
      bundle: envelope.bundle ?? null,
      ingestMeta: envelope.ingestMeta ?? null,
    };
  }
  return { bundle: payload as CardBundlePayload, ingestMeta: null };
}

function groupHighlights(payload: CardBundlePayload) {
  const items =
    payload.highlights ??
    payload.benefits?.map((item) => ({
      category: item.benefitTypeCode,
      title: item.title,
      description: item.description ?? null,
    })) ??
    [];

  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  return HIGHLIGHT_DISPLAY_ORDER.filter((code) => grouped.has(code)).map((code) => ({
    code,
    label: HIGHLIGHT_CATEGORY_LABEL[code] ?? code,
    items: grouped.get(code) ?? [],
  }));
}

function formatInr(value: number | null | undefined): string {
  if (value == null) return '—';
  return value === 0 ? '₹0 (free)' : `₹${value.toLocaleString('en-IN')}`;
}

export function ImportCenterPage({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<CatalogImportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>('PENDING_REVIEW');
  const [entityType, setEntityType] = useState<string>('CARD_BUNDLE');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    liveCatalogCards: number;
    importPending: number;
    importApproved: number;
    importPublished: number;
  } | null>(null);
  const [detailItem, setDetailItem] = useState<CatalogImportItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refresh = useCallback(async () => {
    const [list, importStats] = await Promise.all([
      listCatalogImportItems({
        status: status || undefined,
        entityType: entityType || undefined,
        limit: 100,
      }),
      getCatalogImportStats(),
    ]);
    setItems(list.items);
    setTotal(list.total);
    setStats(importStats);
    if (list.items[0]?.batchId) setLastBatchId(list.items[0].batchId);
  }, [status, entityType]);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    refresh()
      .catch((error: unknown) => {
        setLoadError(
          safeMessage(
            error instanceof Error ? error.message : '',
            'Failed to load the import queue. Check your connection and try again.',
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  async function onApproveAllCards() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await approveAllPendingCatalogItems('CARD_BUNDLE');
      setMessage(
        `Approved ${result.approved} card bundles. Click “Publish all approved cards” to make them visible in the web app.`,
      );
      setStatus('APPROVED');
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Bulk approve failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onPublishAllCards() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await publishAllApprovedCatalogItems('CARD_BUNDLE');
      setMessage(
        `Published ${result.published} card bundles to the live catalog. They should now appear under Web → Add card.`,
      );
      setStatus('PUBLISHED');
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Bulk publish failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onApprove(id: string) {
    setBusy(true);
    try {
      await approveCatalogImportItem(id);
      if (detailItem?.id === id) {
        const updated = await getCatalogImportItem(id);
        setDetailItem(updated);
      }
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Approve failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onReject(id: string) {
    setBusy(true);
    try {
      await rejectCatalogImportItem(id);
      if (detailItem?.id === id) {
        const updated = await getCatalogImportItem(id);
        setDetailItem(updated);
      }
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Reject failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onPublish(id: string) {
    setBusy(true);
    try {
      await publishCatalogImportItem(id);
      setMessage('Published to live catalog — visible in the consumer web app.');
      if (detailItem?.id === id) {
        const updated = await getCatalogImportItem(id);
        setDetailItem(updated);
      }
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Publish failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onPublishBatch() {
    if (!lastBatchId) return;
    setBusy(true);
    try {
      const result = await publishCatalogImportBatch(lastBatchId);
      setMessage(`Published ${result.published} approved items from batch.`);
      await refresh();
    } catch (error) {
      notify.fromError(error, 'Batch publish failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const item = await getCatalogImportItem(id);
      setDetailItem(item);
    } catch (error) {
      notify.fromError(error, 'Failed to load item details.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function retryLoad() {
    setLoading(true);
    setLoadError(null);
    try {
      await refresh();
    } catch (error) {
      setLoadError(
        safeMessage(
          error instanceof Error ? error.message : '',
          'Failed to load the import queue. Check your connection and try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  const detailEnvelope = detailItem ? unwrapImportPayload(detailItem.payload) : null;
  const detailPayload = detailEnvelope?.bundle ?? null;
  const detailIngestMeta = detailEnvelope?.ingestMeta ?? null;
  const fallbackPayload = detailIngestMeta?.fallbackBundle ?? null;
  const highlightGroups = detailPayload ? groupHighlights(detailPayload) : [];

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        {!embedded ? <PageHeroSkeleton /> : null}
        <TableSkeleton />
      </div>
    );
  }

  if (loadError && !stats) {
    return (
      <LoadErrorState
        title="Could not load the import queue"
        description={loadError}
        onRetry={() => void retryLoad()}
      />
    );
  }

  const queueBody = (
    <>
      {!embedded ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="admin-hero__title">Import Center</h1>
              <p className="admin-hero__desc">
                Review staged catalog items, then Approve and Publish. Only Published cards appear
                in the consumer app.
              </p>
              {stats ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Live catalog: <strong>{stats.liveCatalogCards}</strong> cards · Queue:{' '}
                  {stats.importPending} pending · {stats.importApproved} approved ·{' '}
                  {stats.importPublished} published
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : stats ? (
        <p className="text-xs text-muted-foreground">
          Queue: {stats.importPending} pending · {stats.importApproved} approved ·{' '}
          {stats.importPublished} published · Live: {stats.liveCatalogCards} cards
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {entityType === 'CARD_BUNDLE' ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="btn-premium"
              disabled={busy}
              onClick={onApproveAllCards}
            >
              Approve all pending cards
            </Button>
            <Button
              type="button"
              className="btn-premium"
              disabled={busy}
              onClick={onPublishAllCards}
            >
              Publish all approved cards
            </Button>
          </>
        ) : null}
        {lastBatchId ? (
          <Button
            type="button"
            variant="outline"
            className="btn-premium"
            disabled={busy}
            onClick={onPublishBatch}
          >
            Publish batch approved
          </Button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="admin-tabs__list">
        {[
          ['CARD_BUNDLE', 'Cards'],
          ['MERCHANT_UPSERT', 'Merchants'],
          ['MERCHANT_REMOVE', 'Removals'],
          ['', 'All types'],
        ].map(([value, label]) => (
          <button
            key={value || 'all-types'}
            type="button"
            className={entityType === value ? 'is-active' : undefined}
            onClick={() => setEntityType(value ?? '')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-tabs__list">
        {['PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', ''].map((value) => (
          <button
            key={value || 'all'}
            type="button"
            className={status === value ? 'is-active' : undefined}
            onClick={() => setStatus(value)}
          >
            {value ? STATUS_LABEL[value] : 'All statuses'}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{total} items</p>

      {busy || loading || detailLoading ? (
        <div className="admin-loading" role="status">
          <span className="admin-loading__dot" />
          <span className="admin-loading__dot" />
          <span className="admin-loading__dot" />
          Working…
        </div>
      ) : null}

      <div className="admin-table-wrap admin-panel rounded-lg">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Summary</th>
              <th>Source</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No items in this view.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border/60">
                  <td className="px-3 py-2">{item.entityKey}</td>
                  <td className="max-w-xs px-3 py-2 text-muted-foreground">{item.summary}</td>
                  <td className="px-3 py-2">
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                      >
                        Official <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {STATUS_LABEL[item.reviewStatus] ?? item.reviewStatus}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => openDetail(item.id)}
                      >
                        View
                      </Button>
                      {item.reviewStatus === 'PENDING_REVIEW' ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => onApprove(item.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => onReject(item.id)}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {item.reviewStatus === 'APPROVED' ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => onPublish(item.id)}
                        >
                          Publish
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <>
      {embedded ? (
        <Card className="admin-panel admin-panel--accent">
          <CardHeader>
            <CardTitle className="font-display text-xl">Import queue</CardTitle>
            <CardDescription>
              Review staged items, approve changes, then publish to the live catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">{queueBody}</CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-admin-enter">{queueBody}</div>
      )}

      <Dialog open={Boolean(detailItem)} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {detailItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{detailPayload?.name ?? detailItem.entityKey}</DialogTitle>
                <DialogDescription>
                  {detailItem.summary} · Status:{' '}
                  {STATUS_LABEL[detailItem.reviewStatus] ?? detailItem.reviewStatus}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {detailItem.sourceUrl ? (
                  <p>
                    <a
                      href={detailItem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                    >
                      Open official product page <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </p>
                ) : null}

                {detailIngestMeta ? (
                  <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                    <p className="font-medium text-foreground">Ingest method</p>
                    <p className="mt-1 text-muted-foreground">
                      {detailIngestMeta.method}
                      {detailIngestMeta.model ? ` · ${detailIngestMeta.model}` : ''}
                      {detailIngestMeta.promptVersion
                        ? ` · prompt ${detailIngestMeta.promptVersion}`
                        : ''}
                      {detailIngestMeta.latencyMs != null
                        ? ` · ${detailIngestMeta.latencyMs}ms`
                        : ''}
                    </p>
                  </div>
                ) : null}

                {detailPayload ? (
                  <>
                    {detailPayload.tags?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {detailPayload.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Slug</dt>
                        <dd className="font-mono text-xs">{detailPayload.slug}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Network</dt>
                        <dd>{detailPayload.networkCode}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Tier</dt>
                        <dd>{detailPayload.tier}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Joining fee</dt>
                        <dd>{formatInr(detailPayload.joiningFeeInr)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Annual fee</dt>
                        <dd>{formatInr(detailPayload.annualFeeInr)}</dd>
                      </div>
                    </dl>

                    {detailPayload.crawlDescription ? (
                      <div>
                        <p className="font-medium">Overview</p>
                        <p className="mt-1 text-muted-foreground">
                          {detailPayload.crawlDescription}
                        </p>
                      </div>
                    ) : null}

                    {detailPayload.structuredFees?.length ? (
                      <div>
                        <p className="font-medium">Fees &amp; charges</p>
                        <ul className="mt-2 space-y-2">
                          {detailPayload.structuredFees.map((fee) => (
                            <li
                              key={`${fee.feeKind}-${fee.label}`}
                              className="flex flex-col gap-0.5 rounded-md border border-border/60 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                            >
                              <span className="font-medium">{fee.label}</span>
                              <span className="text-muted-foreground sm:max-w-[60%] sm:text-right">
                                {fee.value}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : detailPayload.feesSummary ? (
                      <div>
                        <p className="font-medium">Fees &amp; charges</p>
                        <p className="mt-1 text-muted-foreground">{detailPayload.feesSummary}</p>
                      </div>
                    ) : null}

                    {detailPayload.approvalSummary ? (
                      <div>
                        <p className="font-medium">Approval process</p>
                        <p className="mt-1 text-muted-foreground">
                          {detailPayload.approvalSummary}
                        </p>
                      </div>
                    ) : null}

                    {detailPayload.eligibilitySummary ? (
                      <div>
                        <p className="font-medium">Eligibility</p>
                        <p className="mt-1 text-muted-foreground">
                          {detailPayload.eligibilitySummary}
                        </p>
                      </div>
                    ) : null}

                    {highlightGroups.length ? (
                      <div className="space-y-4">
                        <p className="font-medium">Highlights by category</p>
                        {highlightGroups.map((group) => (
                          <div key={group.code}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {group.label} ({group.items.length})
                            </p>
                            <ul className="mt-2 space-y-2">
                              {group.items.map((item) => (
                                <li
                                  key={`${group.code}-${item.title}`}
                                  className="rounded-md border border-border/60 p-2"
                                >
                                  <p className="font-medium">{item.title}</p>
                                  {item.description ? (
                                    <p className="mt-1 text-muted-foreground">{item.description}</p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {detailPayload.rewardRules?.length ? (
                      <div>
                        <p className="font-medium">
                          Reward rules ({detailPayload.rewardRules.length})
                        </p>
                        <ul className="mt-2 space-y-1 text-muted-foreground">
                          {detailPayload.rewardRules.map((rule) => (
                            <li key={rule.ruleKey}>
                              {rule.name}
                              {rule.payload?.rewardMultiplier
                                ? ` · ${rule.payload.rewardMultiplier}x multiplier`
                                : rule.payload?.cashbackPercent
                                  ? ` · ${rule.payload.cashbackPercent}% cashback`
                                  : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {detailPayload.sourceDocuments?.length ? (
                      <div>
                        <p className="font-medium">
                          Source documents ({detailPayload.sourceDocuments.length})
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Secondary evidence (MITC / T&amp;C / fee schedule) linked from the issuer
                          page — not persisted on publish, for reviewer corroboration only.
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {detailPayload.sourceDocuments.map((doc) => (
                            <li key={doc.url} className="flex items-center justify-between gap-2">
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {SOURCE_DOCUMENT_KIND_LABEL[doc.kind] ?? doc.kind}
                              </span>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 truncate text-primary underline-offset-2 hover:underline"
                              >
                                {doc.label || doc.url}
                                <ExternalLink className="size-3 shrink-0" aria-hidden />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {fallbackPayload ? (
                      <div className="rounded-md border border-dashed border-border/80 p-3">
                        <p className="font-medium">Rule-based fallback comparison</p>
                        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <dt>AI name</dt>
                            <dd className="text-foreground">{detailPayload.name}</dd>
                          </div>
                          <div>
                            <dt>Fallback name</dt>
                            <dd className="text-foreground">{fallbackPayload.name ?? '—'}</dd>
                          </div>
                          <div>
                            <dt>AI highlights</dt>
                            <dd className="text-foreground">
                              {detailPayload.highlights?.length ?? 0}
                            </dd>
                          </div>
                          <div>
                            <dt>Fallback highlights</dt>
                            <dd className="text-foreground">
                              {fallbackPayload.highlights?.length ?? 0}
                            </dd>
                          </div>
                          <div>
                            <dt>AI fees</dt>
                            <dd className="text-foreground">
                              {detailPayload.structuredFees?.length ?? 0}
                            </dd>
                          </div>
                          <div>
                            <dt>Fallback fees</dt>
                            <dd className="text-foreground">
                              {fallbackPayload.structuredFees?.length ?? 0}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
                    {JSON.stringify(detailItem.payload, null, 2)}
                  </pre>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {detailItem.reviewStatus === 'PENDING_REVIEW' ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onReject(detailItem.id)}
                    >
                      Reject
                    </Button>
                    <Button type="button" disabled={busy} onClick={() => onApprove(detailItem.id)}>
                      Approve
                    </Button>
                  </>
                ) : null}
                {detailItem.reviewStatus === 'APPROVED' ? (
                  <Button type="button" disabled={busy} onClick={() => onPublish(detailItem.id)}>
                    Publish to catalog
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
