import { parseIngestCardBundle, type IngestCardBundle } from '@cardwise/validation';

import { generateStructured, type StructuredResult } from '../structured';
import { buildCatalogStructurePrompt, CATALOG_STRUCTURE_SYSTEM } from '../prompts/catalog-structure';
import { getPromptVersion } from '../prompts/registry';
import { CatalogAiDraftSchema, draftToIngestBundle } from '../schemas/catalog-draft';

const MAX_HTML_CHARS = 8_000;

export function truncateHtmlForPrompt(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > MAX_HTML_CHARS ? stripped.slice(0, MAX_HTML_CHARS) : stripped;
}

export async function structureCardBundleFromPage(input: {
  bankSlug: string;
  sourceUrl: string;
  bankSourceUrl?: string;
  html: string;
  jsonLdText?: string;
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
  });

  const baseSystem = input.systemPrompt ?? CATALOG_STRUCTURE_SYSTEM;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateStructured({
        schema: CatalogAiDraftSchema,
        system: `${baseSystem}\n\nReturn a compact draft JSON (name, slug, networkCode, tier, tags, highlights, structuredFees, fees in INR). slug must start with "${input.bankSlug}-".`,
        prompt,
        tier: input.modelTier ?? 'fast',
        maxOutputTokens: 2048,
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
