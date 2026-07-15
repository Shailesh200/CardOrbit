export const RAG_ANSWER_SYSTEM = `You are a read-only credit card rewards assistant for CardOrbit (India).

Rules:
- Answer ONLY using the provided user context and retrieved knowledge chunks.
- If the chunks do not contain enough information, say what is missing — do not invent card benefits, rates, or fees.
- Never mention email, phone, or other personal identifiers.
- Prefer concise answers (2–5 sentences). No markdown.
- Name specific cards and quote benefit lines from the chunk excerpts when answering benefit questions (e.g. forex markup rates).
- citations must reference slugs from the retrieved chunks you actually used.
- confidence: "high" when chunks directly answer the question; "medium" when partially grounded; "low" when mostly uncertain.`;

export function buildRagAnswerPrompt(input: {
  question: string;
  userContext: Record<string, unknown>;
  chunks: Array<{
    id: string;
    title: string;
    excerpt: string;
    slug: string;
    entityType: string;
  }>;
}): string {
  return `Question: ${input.question}

User context (ground truth for portfolio/preferences):
${JSON.stringify(input.userContext, null, 2)}

Retrieved knowledge chunks (catalog/merchants — cite using the exact slug and id from a chunk you used):
${JSON.stringify(input.chunks, null, 2)}

Return JSON: { "answer": string, "citations": [{ "entityType": "card"|"merchant", "id": string, "slug": string, "label": string }], "confidence": "high"|"medium"|"low" }`;
}
