import { parseIngestCardBundle, type IngestCardBundle } from '@cardwise/validation';

import { generateStructured, type StructuredResult } from '../structured';
import { buildCatalogStructurePrompt, CATALOG_STRUCTURE_SYSTEM } from '../prompts/catalog-structure';
import { getPromptVersion } from '../prompts/registry';
import { CatalogAiDraftSchema, draftToIngestBundle } from '../schemas/catalog-draft';

const MAX_HTML_CHARS = 16_000;
const MAX_SECONDARY_TEXT_CHARS = 4_000;

/** Blocks mentioning these terms are prioritized when the page must be truncated to fit budget. */
const PRIORITY_KEYWORDS =
  /\b(reward|cashback|cash\s*back|lounge|milestone|welcome|joining fee|annual fee|apr|forex|eligib|approv|redemption)\b/i;

export function truncateHtmlForPrompt(html: string): string {
  const withBlockBreaks = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const flattened = withBlockBreaks.join(' ').replace(/\s+/g, ' ').trim();
  if (flattened.length <= MAX_HTML_CHARS) return flattened;

  // Section-aware truncation: keep fee/reward/lounge-bearing blocks first so they
  // survive the budget even when they appear late in a long marketing page.
  const priorityBlocks: string[] = [];
  const otherBlocks: string[] = [];
  for (const block of withBlockBreaks) {
    (PRIORITY_KEYWORDS.test(block) ? priorityBlocks : otherBlocks).push(block);
  }

  let combined = '';
  for (const block of [...priorityBlocks, ...otherBlocks]) {
    if (combined.length >= MAX_HTML_CHARS) break;
    combined += (combined ? ' ' : '') + block;
  }

  return combined.replace(/\s+/g, ' ').trim().slice(0, MAX_HTML_CHARS);
}

export async function structureCardBundleFromPage(input: {
  bankSlug: string;
  sourceUrl: string;
  bankSourceUrl?: string;
  html: string;
  jsonLdText?: string;
  /** Secondary evidence extracted from a linked MITC/T&C/fee-schedule PDF, if any. */
  secondaryText?: string;
  systemPrompt?: string;
  modelTier?: 'fast' | 'quality' | 'ping';
  modelOverride?: string | null;
  promptVersion?: string;
  triggeredBy?: string;
}): Promise<StructuredResult<IngestCardBundle>> {
  const prompt = buildCatalogStructurePrompt({
    bankSlug: input.bankSlug,
    sourceUrl: input.sourceUrl,
    bankSourceUrl: input.bankSourceUrl,
    htmlText: truncateHtmlForPrompt(input.html),
    jsonLdText: input.jsonLdText,
    secondaryText: input.secondaryText?.slice(0, MAX_SECONDARY_TEXT_CHARS),
  });

  const baseSystem = input.systemPrompt ?? CATALOG_STRUCTURE_SYSTEM;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateStructured({
        schema: CatalogAiDraftSchema,
        system: `${baseSystem}\n\nReturn a compact draft JSON (name, slug, networkCode, tier, tags, highlights, structuredFees, rewardRules, fees in INR). slug must start with "${input.bankSlug}-".`,
        prompt,
        tier: input.modelTier ?? 'fast',
        maxOutputTokens: 3072,
        feature: 'catalog-structure',
        promptVersion: input.promptVersion ?? getPromptVersion('catalog-structure'),
        modelOverride: input.modelOverride,
        triggeredBy: input.triggeredBy,
      });

      const bundle = draftToIngestBundle(result.data, {
        bankSlug: input.bankSlug,
        sourceUrl: input.sourceUrl,
      });
      parseIngestCardBundle(bundle);

      return {
        data: bundle,
        model: result.model,
        usage: result.usage,
        latencyMs: result.latencyMs,
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI catalog structuring failed');
}
