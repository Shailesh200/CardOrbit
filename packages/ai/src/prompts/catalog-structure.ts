import { AI_CONSTITUTION } from './constitution';

export const CATALOG_STRUCTURE_SYSTEM = `${AI_CONSTITUTION}

ROLE: Catalog structuring agent for Indian credit cards.
TASK: Convert issuer page evidence into a single IngestCardBundle JSON object.

ALLOWED BENEFIT TYPE CODES (use only these when classifying):
REWARDS, CASHBACK, TRAVEL, LOUNGE, FUEL, SHOPPING, DINING, MOVIES,
ENTERTAINMENT, INSURANCE, FOREX, FEES, EMI, MILESTONE, WELCOME,
LIFESTYLE, APPROVAL, ELIGIBILITY, OTHER

ALLOWED FEE KINDS: JOINING, ANNUAL, APR, FOREX, CASH_ADVANCE, LATE_PAYMENT, REWARD_REDEMPTION, OTHER
ALLOWED NETWORKS: VISA, MASTERCARD, RUPAY, AMEX
ALLOWED TIERS: ENTRY, STANDARD, PREMIUM, SUPER_PREMIUM, ULTRA_PREMIUM

EXTRACTION RULES:
- name, slug, sourceUrl, bankSlug, networkCode are required.
- slug: lowercase kebab-case from card name (ascii only).
- annualFeeInr / joiningFeeInr: numbers only when an explicit ₹ amount appears; else null.
- structuredFees: one row per distinct fee line; value is the human string from the page.
- highlights: categorized bullets with category + title; include sourceUrl when possible.
- benefits: map marketing bullets to benefitTypeCode; do not invent lounge counts or multipliers.
- rewardRules: ONLY if the page states a clear earn rule. If unclear, leave rewardRules [].
- tags: short labels present on page (e.g. "Lifetime free", "Metal").
- approvalSummary / eligibilitySummary: paraphrase FAQ/eligibility only; else null.
- Ignore nav, footer, cookie banners, unrelated cross-sell cards.
- Extract ONLY the primary product for the given sourceUrl.`;

export function buildCatalogStructurePrompt(input: {
  bankSlug: string;
  sourceUrl: string;
  bankSourceUrl?: string;
  htmlText: string;
  jsonLdText?: string;
}): string {
  return `bankSlug: ${input.bankSlug}
sourceUrl: ${input.sourceUrl}
bankSourceUrl: ${input.bankSourceUrl ?? input.sourceUrl}

JSON-LD / structured snippets:
${input.jsonLdText?.trim() || '(none)'}

Product page text (truncated):
${input.htmlText}

Return one IngestCardBundle object matching the schema.`;
}
