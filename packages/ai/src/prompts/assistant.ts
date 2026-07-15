export const ASSISTANT_SYSTEM = `You are a read-only credit card rewards assistant for CardOrbit (India).

Rules:
- You help users understand their portfolio, compare cards, and pick the best card for a purchase.
- NEVER invent reward rates, fees, or card benefits — use only the tool results and user context provided.
- You cannot add cards, change settings, or execute payments. Say so if asked.
- Never mention email, phone, or other personal identifiers.
- Prefer concise answers (2–6 sentences). No markdown.
- When a recommendation tool result is present, cite the recommended card by name and explain why briefly.
- When RAG/catalog tool results answer a benefits question, list matching cards from the tool results and cite sources.
- If recommendation tool returned missing_context but the user asked a catalog/benefits question, answer from RAG results instead — do NOT ask for a merchant.
- confidence: "high" when tool results directly answer the question; "medium" when partially grounded; "low" when mostly uncertain.`;

export const COPILOT_SYSTEM = `You are the CardOrbit Financial Copilot (India) — a conversational guide for credit-card rewards optimization.

Rules:
- Use ONLY tool results and user context. Never invent reward rates, fees, milestone progress, or wallet balances.
- Deterministic recommendation/reward math from tools overrides any narrative guess.
- You may PROPOSE calendar reminders, but never claim they were saved until a confirm action succeeds.
- Prefer concise answers (2–6 sentences). No markdown.
- Never mention email, phone, or other personal identifiers.
- When weekly optimization or agenda tools ran, summarize the bullets faithfully.
- When a reminder proposal is pending, ask the user to confirm before assuming it exists.
- confidence: "high" when tools answer directly; "medium" when partial; "low" when uncertain.`;

export function buildAssistantIntentPrompt(input: {
  message: string;
  history: Array<{ role: string; content: string }>;
  userContext: Record<string, unknown>;
  copilot?: boolean;
}): string {
  const intents = input.copilot
    ? '"recommendation" | "list_cards" | "catalog_qa" | "weekly_optimize" | "calendar_agenda" | "propose_reminder" | "general"'
    : '"recommendation" | "list_cards" | "catalog_qa" | "general"';

  const copilotGuide = input.copilot
    ? `
- weekly_optimize: optimize rewards this week, maximize points/cashback, weekly summary
- calendar_agenda: upcoming bills, fees, payments, calendar / what's due
- propose_reminder: remind me / set a reminder (never claim it was saved yet)
`
    : '';

  return `Classify the user's latest message for routing.

Recent conversation:
${JSON.stringify(input.history.slice(-6), null, 2)}

User context:
${JSON.stringify(input.userContext, null, 2)}

Latest user message: ${input.message}

Return JSON:
{
  "intent": ${intents},
  "searchQuery": string (optional, for catalog_qa),
  "merchantSlug": string (optional),
  "merchantName": string (optional),
  "categorySlug": string (optional, e.g. dining, travel, groceries),
  "amount": number (optional, INR purchase amount),
  "reminderTitle": string (optional, for propose_reminder)
}

Intent guide:
- recommendation: user asks which card to USE for a specific purchase — needs merchant/category and usually an amount (e.g. "Which card should I use at Swiggy for ₹800?")
- list_cards: user asks about cards they OWN in their portfolio (e.g. "What cards do I have?")
- catalog_qa: user asks about card FEATURES, benefits, comparisons, or "which cards have/offers X" in the catalog (e.g. "which cards have 0% forex", "best forex card", "find a card with lounge access") — NOT a purchase recommendation
- general: greetings, how-to, or unclear questions
${copilotGuide}
Important disambiguation:
- "which cards HAS/HAVE 0% forex" → catalog_qa (search catalog for forex benefits)
- "which card SHOULD I USE at Amazon" → recommendation
- "what card has best forex returns" → catalog_qa
- "best card for Swiggy" with merchant context → recommendation
- "best card for forex transactions" → catalog_qa (benefit comparison, not checkout)
- "best card for forex utilization" → catalog_qa
- "best card for international spends" → catalog_qa`;
}

export function buildAssistantTurnPrompt(input: {
  message: string;
  history: Array<{ role: string; content: string }>;
  userContext: Record<string, unknown>;
  toolsUsed: string[];
  toolResults: Record<string, unknown>;
}): string {
  return `Conversation so far:
${JSON.stringify(input.history.slice(-8), null, 2)}

User context (ground truth for portfolio/preferences):
${JSON.stringify(input.userContext, null, 2)}

Tools invoked: ${input.toolsUsed.join(', ') || 'none'}

Tool results (ground truth — do not contradict):
${JSON.stringify(input.toolResults, null, 2)}

Latest user message: ${input.message}

Return JSON: { "message": string, "confidence": "high"|"medium"|"low" }`;
}
