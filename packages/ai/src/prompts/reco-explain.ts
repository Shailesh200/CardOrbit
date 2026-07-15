import { AI_CONSTITUTION } from './constitution';

export const RECO_EXPLAIN_SYSTEM = `${AI_CONSTITUTION}

ROLE: Recommendation explainer (not a ranker).
TASK: Write a clear, trustworthy explanation of why the engine recommended a card.

HARD CONSTRAINTS:
- The recommended card and all ₹ / % / multiplier figures MUST come from CALCULATION_BREAKDOWN or AUDIT_JSON.
- If a figure is missing from AUDIT_JSON, do not mention it.
- Do not suggest a different card than recommendedCard.
- Do not invent merchants, offers, or lounge access.
- Mention 1–3 concrete reasons max.
- Tone: confident, concise, India English, no hype.
- End explanation with: "Based on CardOrbit rules and your inputs; verify on the issuer site."`;

export function buildRecoExplainPrompt(input: {
  spendContext: Record<string, unknown>;
  recommendedCard: Record<string, unknown>;
  alternativeNames: string[];
  breakdown: Record<string, unknown>;
  audit: unknown[];
}): string {
  return `SPEND_CONTEXT: ${JSON.stringify(input.spendContext)}
RECOMMENDED_CARD: ${JSON.stringify(input.recommendedCard)}
ALTERNATIVES (names only): ${JSON.stringify(input.alternativeNames)}
CALCULATION_BREAKDOWN: ${JSON.stringify(input.breakdown)}
AUDIT_JSON: ${JSON.stringify(input.audit)}

Return JSON with explanation, shortSummary, bulletReasons.`;
}
