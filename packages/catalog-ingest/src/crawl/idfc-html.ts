import type { IngestCardBundle } from '@cardwise/validation';

import { inferBenefitCategory, normalizeHighlightKey } from './benefit-categories';
import { extractSourceDocumentLinks } from './source-documents';

export type ParsedIdfcHighlight = {
  category: string;
  title: string;
  description: string | null;
  sourceUrl: string;
};

export type ParsedIdfcStructuredFee = IngestCardBundle['structuredFees'][number];

export type ParsedIdfcPageDetails = {
  highlights: ParsedIdfcHighlight[];
  structuredFees: ParsedIdfcStructuredFee[];
  tags: string[];
  approvalSummary: string | null;
  eligibilitySummary: string | null;
  annualFeeInr: number | null;
  joiningFeeInr: number | null;
  sourceDocuments: IngestCardBundle['sourceDocuments'];
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(value: string): string {
  return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

function productHtmlSlice(html: string): string {
  const start =
    html.indexOf('first-cc-rewamp') >= 0
      ? html.indexOf('first-cc-rewamp')
      : html.indexOf('cc-benefit') >= 0
        ? html.indexOf('cc-benefit')
        : 0;

  const endMarkers = [
    'Answering all your questions',
    'How do I apply for a low-interest credit card online?',
    'How do I apply for a credit card online',
    'How to apply for an IDFC FIRST Bank Credit Card?',
  ];

  let end = html.length;
  for (const marker of endMarkers) {
    const idx = html.indexOf(marker, start);
    if (idx > start) end = Math.min(end, idx);
  }

  return html.slice(start, end);
}

function isJunkHighlight(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (/^call us|^download our|^login to|^drop a|^open the idfc|^tap |^locate our|^mobile app$/i.test(title)) {
    return true;
  }
  if (/already have the|idfc first bank mobile app|finfirst blog|deals you can't miss/i.test(text)) {
    return true;
  }
  if (/\b1800\b|\b9555\b|customer care|internet banking/i.test(text) && !/reward|lounge|cashback/i.test(text)) {
    return true;
  }
  if (/personal banking|loan accounts|corporate\/wholesale/i.test(title)) return true;
  return false;
}
function isFaqHeading(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    /^(how|what|when|why|can i|is it|is there|does|do idfc|do i|will i|which|are there|effective)\b/.test(lower) ||
    lower.includes('customer care') ||
    lower.includes('contact us') ||
    lower.includes('faqs') ||
    lower.includes('blog') ||
    lower.includes('answering all your questions')
  );
}

function extractDescriptionAfter(html: string, startIndex: number, maxLength = 1200): string {
  const snippet = html.slice(startIndex, startIndex + maxLength);
  const patterns = [
    /<p[^>]*>([\s\S]{3,400}?)<\/p>/i,
    /<h3[^>]*>([\s\S]{3,160}?)<\/h3>/i,
    /alt="([^"]{10,220})"/i,
    /class="[^"]*(?:desc|sub-title|subtitle)[^"]*"[^>]*>([\s\S]{5,300}?)<\//i,
  ];

  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match?.[1]) {
      const text = cleanTitle(match[1]);
      if (text.length >= 8) return text;
    }
  }

  return '';
}

function isSelfDescribingTitle(title: string): boolean {
  return /[%₹]|\bfree\b|\bwaiver\b|\d+\s*x\b|\boff\b|\bbonus\b|\bcomplimentary\b/i.test(title);
}

function extractHeadingBlocks(html: string, sourceUrl: string): ParsedIdfcHighlight[] {
  const slice = productHtmlSlice(html);
  const highlights: ParsedIdfcHighlight[] = [];
  const seen = new Set<string>();

  const headingPattern = /<h([23])[^>]*>([\s\S]{3,160}?)<\/h\1>/gi;
  for (const match of slice.matchAll(headingPattern)) {
    const rawTitle = match[2] ?? '';
    const title = cleanTitle(rawTitle);
    if (title.length < 4 || title.length > 110) continue;
    if (isFaqHeading(title)) continue;
    if (/credit card –/i.test(title) || /credit card -/i.test(title)) continue;

    const description = extractDescriptionAfter(slice, (match.index ?? 0) + match[0].length);
    if (isJunkHighlight(title, description)) continue;
    if (!description && !isSelfDescribingTitle(title) && title.length < 15) continue;

    const key = normalizeHighlightKey(title);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    highlights.push({
      category: inferBenefitCategory(title, description),
      title,
      description: description || null,
      sourceUrl,
    });
  }

  return highlights;
}

function extractRewardTierHighlights(html: string, sourceUrl: string): ParsedIdfcHighlight[] {
  const slice = productHtmlSlice(html);
  const tiers: ParsedIdfcHighlight[] = [];

  for (const label of ['10X Reward Points', '3X Reward Points', '1X Reward Points']) {
    const idx = slice.indexOf(label);
    if (idx < 0) continue;
    const description = extractDescriptionAfter(slice, idx);
    if (!description) continue;
    tiers.push({
      category: 'REWARDS',
      title: label,
      description,
      sourceUrl,
    });
  }

  return tiers;
}

function parseFeeAmount(value: string): number | null {
  const lower = value.toLowerCase();
  if (/\bnil\b|\bzero\b|\blifetime free\b|\bno annual fee\b/.test(lower)) return 0;
  const match = value.match(/₹\s*([\d,]+(?:\.\d+)?)/);
  if (match?.[1]) return Number(match[1].replace(/,/g, ''));
  return null;
}

function extractStructuredFees(html: string): {
  structuredFees: ParsedIdfcStructuredFee[];
  annualFeeInr: number | null;
  joiningFeeInr: number | null;
} {
  const structuredFees: ParsedIdfcStructuredFee[] = [];
  let annualFeeInr: number | null = null;
  let joiningFeeInr: number | null = null;

  const feesIdx = html.toLowerCase().indexOf('joining and annual fees');
  if (feesIdx >= 0) {
    const chunk = decodeHtml(html.slice(feesIdx, feesIdx + 2500));
    const joiningAnnual = chunk.match(/joining and annual fees\s+(.+?)(?:interest rates|cash withdrawals|$)/i)?.[1]?.trim();
    if (joiningAnnual) {
      const amount = parseFeeAmount(joiningAnnual);
      joiningFeeInr = amount;
      annualFeeInr = amount;
      structuredFees.push({
        feeKind: 'JOINING',
        label: 'Joining fee',
        value: joiningAnnual,
      });
      structuredFees.push({
        feeKind: 'ANNUAL',
        label: 'Annual fee',
        value: joiningAnnual,
      });
    }

    const apr = chunk.match(/annual percentage rate\s*\(apr\)\s*(.+?)(?:cash withdrawals|accelerated rewards|$)/i)?.[1]?.trim();
    if (apr) {
      structuredFees.push({ feeKind: 'APR', label: 'Interest rate (APR)', value: apr });
    }

    const cash = chunk.match(/cash withdrawals\s*(.+?)(?:click here|accelerated rewards|redeem your|$)/i)?.[1]?.trim();
    if (cash) {
      structuredFees.push({ feeKind: 'CASH_ADVANCE', label: 'Cash withdrawal', value: cash });
    }
  }

  const forexMatch = decodeHtml(html).match(/(\d+(?:\.\d+)?)\s*%\s*forex/i);
  if (forexMatch) {
    structuredFees.push({
      feeKind: 'FOREX',
      label: 'Forex markup',
      value: `${forexMatch[1]}% on international transactions`,
    });
  }

  const redemptionMatch = decodeHtml(html).match(/₹\s*([\d,]+)[^.\n]{0,40}reward redemption/i);
  if (redemptionMatch) {
    structuredFees.push({
      feeKind: 'REWARD_REDEMPTION',
      label: 'Reward redemption fee',
      value: `₹${redemptionMatch[1]} + GST per redemption (verify on issuer page)`,
    });
  }

  return { structuredFees, annualFeeInr, joiningFeeInr };
}

function extractApprovalSummary(html: string): string | null {
  const markers = [
    'How do I apply for a low-interest credit card online?',
    'How to apply for an IDFC FIRST Bank Credit Card?',
    'How to apply for a credit card online',
    'How do I apply for a credit card?',
  ];

  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx < 0) continue;
    const text = decodeHtml(html.slice(idx, idx + 1200));
    const answer = text.replace(marker, '').trim();
    if (answer.length > 40) return answer.slice(0, 600);
  }

  return null;
}

function extractEligibilitySummary(html: string): string | null {
  const text = decodeHtml(html);
  const match = text.match(
    /(?:eligibility|who can apply)[^.!?]{0,80}[.!?]\s*([^.!?]{20,300}[.!?])/i,
  );
  if (match?.[1]) return match[1].trim();

  if (/salaried|self-employed|minimum age|credit score/i.test(text)) {
    const snippet = text.match(
      /((?:salaried|self-employed)[^.!?]{10,200}(?:minimum age|credit score)[^.!?]{0,120}[.!?])/i,
    );
    if (snippet?.[1]) return snippet[1].trim();
  }

  return null;
}

function inferTags(
  cardName: string,
  path: string,
  html: string,
  structuredFees: ParsedIdfcStructuredFee[],
): string[] {
  const tags = new Set<string>();
  const overview = decodeHtml(html.match(/<meta name="description" content="([^"]+)"/i)?.[1] ?? '').toLowerCase();
  const feeText = structuredFees.map((fee) => fee.value).join(' ').toLowerCase();
  const haystack = `${cardName} ${path} ${overview} ${feeText}`.toLowerCase();

  if (
    haystack.includes('lifetime free') ||
    haystack.includes('no annual fee') ||
    structuredFees.some((f) => f.feeKind === 'ANNUAL' && f.value.toLowerCase().includes('nil'))
  ) {
    tags.add('Lifetime free');
  }
  if (path.includes('metal-credit-card')) tags.add('Metal card');
  if (path.includes('against-fixed-deposits') || /\bfd-backed\b|\bfixed deposit\b/.test(haystack)) {
    tags.add('FD-backed');
  }
  if (path.includes('rupay')) tags.add('RuPay');
  if (path.includes('business')) tags.add('Business');
  if (path.includes('corporate')) tags.add('Corporate');
  if (path.includes('fuel') || path.includes('hpcl')) tags.add('Fuel');
  if (path.includes('cashback')) tags.add('Cashback');
  if (path.includes('indigo') || path.includes('vistara') || path.includes('lic')) tags.add('Co-branded');
  if (/\bupi on credit card\b|\bupi-enabled\b|\bupi rewards\b|\bupi spends\b/.test(haystack)) {
    tags.add('UPI enabled');
  }
  if (/\bzero forex\b|\b0% forex\b|\b0 forex markup\b/.test(haystack)) tags.add('Zero forex markup');
  if (/\blounge access\b|\bairport lounge\b|\brailway lounge\b/.test(haystack)) tags.add('Lounge access');

  return [...tags];
}

function dedupeHighlights(items: ParsedIdfcHighlight[]): ParsedIdfcHighlight[] {
  const byKey = new Map<string, ParsedIdfcHighlight>();
  for (const item of items) {
    const key = normalizeHighlightKey(item.title);
    const existing = byKey.get(key);
    if (!existing || (item.description?.length ?? 0) > (existing.description?.length ?? 0)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

export function parseIdfcProductPageHtml(
  html: string,
  sourceUrl: string,
  cardName: string,
  path: string,
): ParsedIdfcPageDetails {
  const headingHighlights = extractHeadingBlocks(html, sourceUrl);
  const rewardHighlights = extractRewardTierHighlights(html, sourceUrl);
  const { structuredFees, annualFeeInr, joiningFeeInr } = extractStructuredFees(html);
  const approvalSummary = extractApprovalSummary(html);
  const eligibilitySummary = extractEligibilitySummary(html);
  const tags = inferTags(cardName, path, html, structuredFees);
  // Full (unsliced) page HTML so MITC/T&C links in the footer/FAQ area are still captured
  // even though productHtmlSlice() truncates before those sections for highlight extraction.
  const sourceDocuments = extractSourceDocumentLinks(html, sourceUrl);

  const highlights = dedupeHighlights([...headingHighlights, ...rewardHighlights]);

  if (approvalSummary) {
    highlights.push({
      category: 'APPROVAL',
      title: 'How to apply',
      description: approvalSummary,
      sourceUrl,
    });
  }

  if (eligibilitySummary) {
    highlights.push({
      category: 'ELIGIBILITY',
      title: 'Eligibility',
      description: eligibilitySummary,
      sourceUrl,
    });
  }

  return {
    highlights: dedupeHighlights(highlights),
    structuredFees,
    tags,
    approvalSummary,
    eligibilitySummary,
    annualFeeInr,
    joiningFeeInr,
    sourceDocuments,
  };
}
