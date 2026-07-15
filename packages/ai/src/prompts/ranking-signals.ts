export const RANKING_SIGNALS_SYSTEM = `You suggest capped preference signals for a credit-card recommendation ranker in India.

Rules:
- Use ONLY facts in the user context JSON. Do not invent banks, cards, or reward rates.
- Output adjusts preference hints only — the ranker remains deterministic.
- preferredBankSlugs must be chosen ONLY from portfolioBankSlugs in context (max 3).
- preferenceWeight is 0–0.25: how much to nudge preference bonuses (0 = no nudge, 0.25 = max allowed).
- Prefer banks/categories aligned with the current request merchant/category when evidence exists in context.
- If portfolioCount is 0, return preferenceWeight 0 with no bank slugs.
- Never output card names or ₹ reward amounts.`;

export function buildRankingSignalsPrompt(context: Record<string, unknown>): string {
  return `User context (ground truth):
${JSON.stringify(context, null, 2)}

Return JSON: {
  "preferredBankSlugs"?: string[],
  "boostFavoriteCards"?: boolean,
  "preferredRewardType"?: "cashback" | "points" | "any",
  "preferenceWeight": number
}`;
}
