import type { IngestSourceDocument } from '@cardwise/validation';

const ANCHOR_PATTERN = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;

function decodeAnchorText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyDocumentLink(url: string, label: string): IngestSourceDocument['kind'] | null {
  const haystack = `${url} ${label}`.toLowerCase();

  if (/\bmitc\b|most[- ]important[- ]terms/.test(haystack)) return 'MITC';
  if (/key[- ]fact[- ]statement|\bkfs\b/.test(haystack)) return 'KFS';
  if (/schedule[- ]of[- ]charges|fees?[- ]and[- ]charges|fee[- ]schedule/.test(haystack)) {
    return 'SCHEDULE_OF_CHARGES';
  }
  if (/terms[- ]and[- ]conditions|\btnc\b|\bt&c\b|\bt & c\b/.test(haystack)) return 'TNC';
  if (/\.pdf(\?|#|$)/.test(url.toLowerCase())) return 'PDF';

  return null;
}

/**
 * Scans raw product page HTML for links to MITC / T&C / fee-schedule PDFs so they can be
 * captured as secondary evidence on the ingest bundle. Intentionally independent of the
 * product-page discovery exclusion lists: those exist to stop MITC/PDF URLs from being
 * *crawled as if they were card product pages*, but the links themselves should still be
 * captured here whenever they appear on a page we already know is a real product page.
 */
export function extractSourceDocumentLinks(html: string, pageUrl: string): IngestSourceDocument[] {
  const seen = new Map<string, IngestSourceDocument>();

  for (const match of html.matchAll(ANCHOR_PATTERN)) {
    const rawHref = match[1]?.trim();
    if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) continue;
    const label = decodeAnchorText(match[2] ?? '');

    let absolute: URL;
    try {
      absolute = new URL(rawHref, pageUrl);
    } catch {
      continue;
    }
    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') continue;

    const kind = classifyDocumentLink(absolute.href, label);
    if (!kind) continue;

    const key = absolute.href;
    if (seen.has(key)) continue;
    seen.set(key, { url: absolute.href, label: label || null, kind });
  }

  return [...seen.values()];
}

/** Dedupes by URL across multiple sources (runner-detected, AI draft, rule-based fallback). */
export function mergeSourceDocuments(
  ...groups: IngestSourceDocument[][]
): IngestSourceDocument[] {
  const seen = new Map<string, IngestSourceDocument>();
  for (const group of groups) {
    for (const doc of group) {
      if (!seen.has(doc.url)) seen.set(doc.url, doc);
    }
  }
  return [...seen.values()];
}
