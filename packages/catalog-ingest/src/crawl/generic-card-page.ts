import type { IngestCardBundle } from '@cardwise/validation';

import { inferBenefitCategory } from './benefit-categories';
import {
  collectOffers,
  extractJsonLdBlocks,
  findBestCreditCardSchema,
  formatFeesSummary,
  parseHtmlFallback,
} from './json-ld';
import { extractSourceDocumentLinks } from './source-documents';
import { bankCatalogUrl } from '../india/bank-sources';

function slugFromUrl(sourceUrl: string, bankSlug: string): string {
  const path = new URL(sourceUrl).pathname.replace(/\/+$/, '');
  const segment = (path.split('/').pop() ?? 'card').replace(/\.html$/i, '');
  return `${bankSlug}-${segment}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanCardName(rawName: string): string {
  return rawName
    .trim()
    .replace(/^Apply for (the )?/i, '')
    .replace(/\s+Online$/i, '')
    .split('|')[0]
    ?.replace(/\s*-\s*Get .*$/i, '')
    .replace(/\s*-\s*Apply.*$/i, '')
    .replace(/\s*\|\s*HDFC Bank.*$/i, '')
    .replace(/\s*\|\s*ICICI Bank.*$/i, '')
    .replace(/\s*\|\s*Axis Bank.*$/i, '')
    .trim() ?? rawName.trim();
}

function inferTier(name: string, sourceUrl: string): IngestCardBundle['tier'] {
  const haystack = `${name} ${sourceUrl}`.toLowerCase();
  if (
    haystack.includes('infinia') ||
    haystack.includes('diners club black') ||
    haystack.includes('private') ||
    haystack.includes('metal edition')
  ) {
    return 'ULTRA_PREMIUM';
  }
  if (
    haystack.includes('regalia') ||
    haystack.includes('diners') ||
    haystack.includes('platinum') ||
    haystack.includes('premium')
  ) {
    return 'PREMIUM';
  }
  if (haystack.includes('millennia') || haystack.includes('freedom') || haystack.includes('moneyback')) {
    return 'ENTRY';
  }
  return 'STANDARD';
}

function inferNetwork(name: string, sourceUrl: string): IngestCardBundle['networkCode'] {
  const haystack = `${name} ${sourceUrl}`.toLowerCase();
  if (haystack.includes('rupay')) return 'RUPAY';
  if (haystack.includes('amex') || haystack.includes('american express')) return 'AMEX';
  if (haystack.includes('mastercard') || haystack.includes('master card')) return 'MASTERCARD';
  if (haystack.includes('diners')) return 'MASTERCARD';
  return 'VISA';
}

function parseAnnualFee(text: string): number | null {
  const lower = text.toLowerCase();
  if (/\blifetime free\b|\bzero annual fee\b|\bno annual fee\b|\bltf\b/.test(lower)) {
    return 0;
  }
  const match = text.match(/(?:annual fee|renewal fee)[^₹\d]{0,24}₹\s*([\d,]+)/i);
  if (match?.[1]) return Number(match[1].replace(/,/g, ''));
  return null;
}

function parseRewardMultiplier(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*x/i);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function highlightsToBenefits(highlights: IngestCardBundle['highlights']): IngestCardBundle['benefits'] {
  return highlights.map((item) => ({
    benefitTypeCode: item.category,
    title: item.title,
    description: item.description ?? null,
    sourceUrl: item.sourceUrl ?? null,
  }));
}

/**
 * Rule-based card page parser for issuers without a dedicated crawler.
 * Uses JSON-LD + page title/description — enough to stage a reviewable import item.
 */
export function parseGenericCardPage(input: {
  bankSlug: string;
  sourceUrl: string;
  html: string;
  bankSourceUrl?: string;
}): IngestCardBundle | null {
  const schema = findBestCreditCardSchema(extractJsonLdBlocks(input.html));
  const fallback = schema ? null : parseHtmlFallback(input.html);
  if (!schema && !fallback) return null;

  const offers = schema ? collectOffers(schema) : [];
  const cardName = cleanCardName(schema?.name ?? fallback?.name ?? '');
  if (cardName.length < 3) return null;

  const slug = slugFromUrl(input.sourceUrl, input.bankSlug);
  const description = schema?.description?.trim() ?? fallback?.description ?? null;
  const feesSummary = formatFeesSummary(schema?.feesAndCommissionsSpecification);

  const highlights: IngestCardBundle['highlights'] = offers.map((offer) => ({
    category: inferBenefitCategory(offer.name, offer.description),
    title: offer.name,
    description: offer.description || null,
    sourceUrl: input.sourceUrl,
  }));

  if (!highlights.length && description) {
    highlights.push({
      category: 'REWARDS',
      title: 'Product overview',
      description,
      sourceUrl: input.sourceUrl,
    });
  }

  if (feesSummary) {
    highlights.push({
      category: 'FEES',
      title: 'Fees & charges (issuer summary)',
      description: feesSummary,
      sourceUrl: input.sourceUrl,
    });
  }

  const feeText = `${description ?? ''} ${feesSummary ?? ''}`;
  const annualFeeInr = parseAnnualFee(feeText);
  const joiningFeeInr = annualFeeInr;

  const rewardText = highlights
    .filter((item) => item.category === 'REWARDS')
    .map((item) => `${item.title} ${item.description ?? ''}`)
    .join(' ');
  const rewardMultiplier = parseRewardMultiplier(rewardText) ?? parseRewardMultiplier(description ?? '');
  const rewardRules: IngestCardBundle['rewardRules'] = rewardMultiplier
    ? [
        {
          ruleKey: `${slug}-base-rewards`,
          name: 'Base reward points (crawled summary)',
          spendCategoryCode: null,
          merchantSlug: null,
          payload: { rewardMultiplier, exclusions: [] },
          validFrom: '2026-01-01',
          validUntil: null,
          sourceUrl: input.sourceUrl,
        },
      ]
    : [];

  const structuredFees = feesSummary
    ? [{ feeKind: 'OTHER' as const, label: 'Fees & charges (issuer summary)', value: feesSummary }]
    : [];

  return {
    bankSlug: input.bankSlug,
    bankSourceUrl: input.bankSourceUrl ?? bankCatalogUrl(input.bankSlug),
    name: cardName,
    slug,
    sourceUrl: input.sourceUrl,
    networkCode: inferNetwork(cardName, input.sourceUrl),
    tier: inferTier(cardName, input.sourceUrl),
    annualFeeInr,
    joiningFeeInr,
    rewardProgramSlug: null,
    pointValueInr: null,
    tags: [],
    structuredFees,
    highlights,
    approvalSummary: null,
    eligibilitySummary: null,
    benefits: highlightsToBenefits(highlights),
    rewardRules,
    crawlDescription: description,
    feesSummary,
    sourceDocuments: extractSourceDocumentLinks(input.html, input.sourceUrl),
  };
}
