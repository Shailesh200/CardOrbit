# CardWise — AI / LLM Data Processing (Privacy Note)

> **Status:** Draft for operators and public beta  
> **Scope:** CardWise product features that call Google Gemini via `packages/ai`  
> **Last updated:** 2026-07-11

## Summary

CardWise uses a third-party LLM (Google Gemini) to **structure catalog data** and **explain deterministic recommendations**. The reward engine and card ranking are **never** LLM-driven. AI features are gated by feature flags and can be disabled per environment.

## What we send to the LLM

| Feature | Data sent | PII |
|---------|-----------|-----|
| Catalog AI ingest | Public issuer HTML + structured prompt context (bank slug, source URL) | **No** user PII |
| Recommendation explanations | Deterministic audit JSON (card slugs, ₹ amounts, rule keys, merchant/category slugs) | **No** email, phone, name, or account numbers |
| Admin ping / health checks | Minimal test prompt | **No** |

We do **not** send:

- User email, phone, legal name, or government IDs  
- Full payment card numbers or CVV  
- Raw bank credentials or statement PDFs  

## What we store

- **AiRun** audit rows: feature, model, provider, latency, token counts, success/failure, optional error text  
- **Prompt versions** in admin DB (system prompts — no user content)  
- **Catalog import queue** payloads staged for admin review before publish  

Prompt/response bodies are not retained long-term in production logs by default; operators should avoid enabling verbose LLM logging in production.

## Provider

- **Provider:** Google Gemini (`@google/genai`)  
- **Key storage:** `GEMINI_API_KEY` in environment / secrets manager — never in git  
- **Billing & retention:** Governed by [Google AI Studio / Gemini API terms](https://ai.google.dev/gemini-api/terms)

Review Google's data processing terms before production launch and enable any available **zero-retention** or enterprise controls if required for your deployment.

## User controls (planned / beta)

| Control | Status |
|---------|--------|
| Feature flags (`ai_platform_enabled`, `ai_explanations_enabled`, etc.) | ✅ Environment / admin |
| Per-user opt-out of AI explanations | 🔲 AI-012 (before public beta) |
| Admin-only catalog AI ingest | ✅ |

## Operator checklist

- [ ] `GEMINI_API_KEY` only in secrets / `.env.local`  
- [ ] AI flags default **off** in production until reviewed  
- [ ] Catalog AI output **never auto-published** — admin review required  
- [ ] Link this note from privacy policy / in-app settings when AI-012 ships  

## Related docs

- [`plans/GEMINI_SETUP_AND_PROMPTS.md`](./GEMINI_SETUP_AND_PROMPTS.md) — operator setup  
- [`plans/AI_INTEGRATION_PLAN.md`](./AI_INTEGRATION_PLAN.md) — architecture and gates  
