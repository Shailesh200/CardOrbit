import { INDIA_BANK_SOURCES } from '@cardwise/catalog-ingest';
import { catalogAiIngestJob, catalogCrawlJob, getJobDefinition } from '@cardwise/jobs';

export type JobConfigView = {
  jobLabel: string;
  bankSlug: string | null;
  bankName: string | null;
  merchantSlug: string | null;
  merchantName: string | null;
  targetLabel: string;
  configSummary: string;
  purgePendingLabel: string;
  limitPagesLabel: string;
  progressSummary: string | null;
};

const JOB_LABELS: Record<string, string> = {
  [catalogAiIngestJob.type]: 'AI catalog ingest',
  [catalogCrawlJob.type]: 'Rule-based crawl',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bankNameForSlug(slug: string | null): string | null {
  if (!slug) return null;
  return INDIA_BANK_SOURCES.find((bank) => bank.slug === slug)?.name ?? slug;
}

function formatMerchantLabel(slug: string | null): string | null {
  if (!slug) return null;
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildJobConfigView(input: {
  type: string;
  payload: unknown;
  progress: unknown;
  result: unknown;
  status: string;
}): JobConfigView {
  const payload = asRecord(input.payload);
  const progress = asRecord(input.progress);
  const result = asRecord(input.result);

  const bankSlug = typeof payload.bankSlug === 'string' ? payload.bankSlug : null;
  const merchantSlug = typeof payload.merchantSlug === 'string' ? payload.merchantSlug : null;
  const bankName = bankNameForSlug(bankSlug);
  const merchantName = formatMerchantLabel(merchantSlug);

  const purgePendingLabel =
    payload.purgePending === true ? 'true' : payload.purgePending === false ? 'false' : '—';
  const limitPagesLabel =
    typeof payload.limit === 'number' && payload.limit > 0 ? String(payload.limit) : '—';

  const configParts: string[] = [];
  if (payload.purgePending === true) configParts.push('Clear pending queue');
  if (payload.purgePending === false) configParts.push('Keep pending queue');
  if (typeof payload.limit === 'number' && payload.limit > 0) {
    configParts.push(`Limit ${payload.limit} pages`);
  }

  const def = getJobDefinition(input.type);
  const jobLabel = JOB_LABELS[input.type] ?? def?.description ?? input.type;

  const targetLabel = merchantName ?? bankName ?? bankSlug ?? merchantSlug ?? '—';
  const configSummary = configParts.length > 0 ? configParts.join(' · ') : 'Default settings';

  const done = typeof progress.done === 'number' ? progress.done : null;
  const total = typeof progress.total === 'number' ? progress.total : null;
  const itemCount =
    typeof progress.itemCount === 'number'
      ? progress.itemCount
      : typeof result.itemCount === 'number'
        ? result.itemCount
        : null;

  let progressSummary: string | null = null;
  if (input.status === 'COMPLETED' && itemCount != null) {
    progressSummary = `${itemCount} staged`;
    if (
      typeof result.failedUrls === 'object' &&
      Array.isArray(result.failedUrls) &&
      result.failedUrls.length
    ) {
      progressSummary += ` · ${result.failedUrls.length} failed`;
    }
  } else if (done != null && total != null && total > 0) {
    progressSummary = `${done}/${total} pages`;
    if (itemCount != null) progressSummary += ` · ${itemCount} staged`;
  } else if (itemCount != null) {
    progressSummary = `${itemCount} staged`;
  }

  return {
    jobLabel,
    bankSlug,
    bankName,
    merchantSlug,
    merchantName,
    targetLabel,
    configSummary,
    purgePendingLabel,
    limitPagesLabel,
    progressSummary,
  };
}
