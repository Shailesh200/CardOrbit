# CardWise — AI Integration Plan

> **Status:** Approved planning document (execution pending)  
> **Version:** 1.0  
> **Date:** 2026-07-10  
> **Authority:** Defines **what**, **where**, and **how** AI is integrated across CardWise  
> **Parent plan:** [`00_MASTER_DEVELOPMENT_PLAN.md`](./00_MASTER_DEVELOPMENT_PLAN.md)  
> **Architecture reference:** [`docs/09_AI_AND_RECOMMENDATION_ENGINE.md`](../docs/09_AI_AND_RECOMMENDATION_ENGINE.md)  
> **Operator setup + prompts:** [`GEMINI_SETUP_AND_PROMPTS.md`](./GEMINI_SETUP_AND_PROMPTS.md)

---

# 1. Executive Summary

CardWise will become an **AI-native financial decision intelligence platform** by adding a **shared AI platform** on top of the existing **deterministic intelligence core** (reward engine, recommendation ranker, catalog DB).

**Key decisions (this plan):**

| Decision | Choice |
|----------|--------|
| **Catalog data** | Deprecate rule-based-only crawl as primary path; use **fetch + AI structuring + admin review** |
| **Recommendations** | **Never** LLM-ranked; AI explains deterministic results only |
| **Execution** | New **AI-001–AI-012** track runs **before M-029** (minimum AI-001–AI-005) |
| **Provider** | **Google Gemini** (`@google/genai`); default model `gemini-flash-latest`; swap via `AI_PROVIDER` + env keys |
| **Governance** | Feature flags, Zod schemas, eval harness, audit logs, human review for public catalog |
| **Prompts** | Versioned task prompts + global constitution — see [`GEMINI_SETUP_AND_PROMPTS.md`](./GEMINI_SETUP_AND_PROMPTS.md) |

**North star (G-4 early):** AI explains recommendations with cited sources; catalog is AI-structured from issuer pages; **zero hallucinated reward rates** in user-facing output.

---

# 2. Core Philosophy (non-negotiable)

From `docs/09_AI` — AI-PHIL-001 through AI-PHIL-006:

```text
Compliance / business rules
        ↓
Eligibility & reward engine (deterministic)
        ↓
Ranking & optimization (deterministic, preference-aware)
        ↓
ML / embeddings (retrieval, similarity — optional signals)
        ↓
LLM (structure, explain, search, converse)
```

| Layer | AI allowed? | Examples |
|-------|-------------|----------|
| **Money & rates** | ❌ No LLM as source of truth | Reward ₹, APR, annual fee, multiplier |
| **Structure & language** | ✅ Yes | Tags, benefit categories, summaries |
| **Explanation** | ✅ Yes (grounded) | “Use HDFC Millennia because 5% dining…” |
| **Retrieval** | ✅ Yes | Semantic card search, RAG for assistant |
| **Autonomous actions** | ❌ Until copilot phase | No auto-add card, no auto-publish catalog |

---

# 3. Architecture

## 3.1 Three-layer model

```text
┌──────────────────────────────────────────────────────────────────┐
│  Experience Layer (apps/web, apps/admin, extension, mobile)      │
│  AI badges, explanations, insights, search, assistant UI       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  AI Platform Layer (NEW — packages/ai + services/api/modules/ai) │
│  Tasks · Prompts · Structured output · Logging · Evals · Flags   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ reads / never overrides
┌────────────────────────────▼─────────────────────────────────────┐
│  Deterministic Intelligence (EXISTING)                            │
│  Prisma DB · Reward engine · Reco ranker · Catalog import queue  │
└──────────────────────────────────────────────────────────────────┘
```

## 3.2 New packages & modules

| Artifact | Path | Role |
|----------|------|------|
| **AI SDK wrapper** | `packages/ai/` | Model calls, schemas, prompts, task runners |
| **AI module** | `services/api/src/modules/ai/` | NestJS orchestration, HTTP admin APIs |
| **AI persistence** | `services/api/prisma` | `AiRun`, `AiPromptVersion`, optional `AiEvalResult` |
| **Feature flags** | `packages/feature-flags/` | Per-feature AI toggles |
| **Validation** | `packages/validation/` | Zod schemas for all AI inputs/outputs |

## 3.3 Standard AI task contract

Every AI feature uses the same pattern:

1. **Build context** — JSON from DB / fetch / reco audit (no PII in logs)
2. **Select prompt** — versioned registry entry
3. **Call model** — `generateObject` with Zod schema
4. **Validate** — schema + domain safety checks (numbers match audit)
5. **Log** — `AiRun` row (feature, model, tokens, latency, success)
6. **Fallback** — template / rule-based path on failure
7. **Flag gate** — skip AI if feature flag off

---

# 4. Where AI integrates (complete map)

## 4.1 Catalog & data intelligence

| Surface | Current | With AI | Human review? | Flag |
|---------|---------|---------|---------------|------|
| **Bank card ingestion** | Rule-based HTML crawl → import queue | Fetch issuer URL → extract raw → **AI structure** → queue | ✅ Required before publish | `ai_catalog_structuring_enabled` |
| **Merchant enrichment** | Manual / seed | AI suggest aliases, category, tags | ✅ Admin approve | `ai_merchant_enrichment_enabled` |
| **Offer parsing** | Manual CMS | AI extract offer terms from bank pages | ✅ Admin approve | `ai_offer_parsing_enabled` |
| **Data quality alerts** | Metrics only | AI summarize gaps (“12 cards missing fuel rules”) | ❌ Internal | `ai_admin_insights_enabled` |

**Catalog pipeline (replaces crawl-first approach):**

```text
Admin: "Ingest IDFC FIRST Bank"
  → Discover card URLs (sitemap + listing page — deterministic fetch only)
  → For each URL: download HTML + JSON-LD snippets
  → AI task: structureCardBundle(raw) → IngestCardBundle
  → Zod validate
  → CatalogImportItem (PENDING_REVIEW)
  → Admin: View details (tags, fees, highlights by category)
  → Approve → Publish → live catalog
```

Rule-based parser (`packages/catalog-ingest`) becomes **fallback** when AI flag off or AI validation fails.

---

## 4.2 Recommendations & rewards

| Surface | Current | With AI | LLM touches ranking? | Flag |
|---------|---------|---------|----------------------|------|
| **Best card API** | `rankCardRecommendations` + template `explanation` | AI natural-language explanation + “See calculation” | ❌ No | `ai_explanations_enabled` |
| **Showcase / hero reco** | Same engine | Shorter AI summary | ❌ No | `ai_explanations_enabled` |
| **Reco history** | M-033 planned | AI “what you could have earned” narrative | ❌ No | `ai_insights_enabled` |
| **Preference-aware ranking** | M-027 scoring overrides | AI suggests preference weights from feedback (admin/user opt-in) | ⚠️ Signals only, capped | `ai_ranking_signals_enabled` |
| **Reward calculator** | Deterministic | AI explain single transaction calc | ❌ No | `ai_explanations_enabled` |

**Recommendation API shape (target):**

```typescript
{
  recommendedCard: { ... },      // unchanged — deterministic
  alternatives: [ ... ],         // unchanged
  explanation: string,             // AI or template
  explanationSource: 'ai' | 'template',
  calculationBreakdown: { ... }, // always deterministic, always present
  citations: [{ type, id, url }]  // rule ids, benefit ids, offer urls
}
```

---

## 4.3 Consumer web & mobile

| Feature | Milestone | AI role | Phase |
|---------|-----------|---------|-------|
| **Card detail benefits** | M-018 + AI-004 | Grouped categories; optional AI “key highlights” strip | AI-004 |
| **Add card / catalog browse** | M-015 | AI-generated compare blurbs (from catalog) | AI-008 |
| **Dashboard** | M-029 (after AI-G1) | Smart insight cards (AI narrative, deterministic facts) | AI-006 |
| **Universal search** | M-064 → **AI-008** | Semantic search over cards, merchants, benefits | AI-008 |
| **Trip planner copy** | M-046 | AI itinerary text; engine picks cards per spend type | AI-009 |
| **Notifications** | M-051 | AI personalization of notification copy | AI-006 |

---

## 4.4 Admin portal

| Feature | AI role | Milestone |
|---------|---------|-----------|
| **Import Center** | AI-structured payload review; diff vs fallback parser | AI-003 |
| **AI Runs dashboard** | Token usage, failures, prompt version | AI-002 |
| **Prompt registry** | Edit/version prompts (super-admin) | AI-002 |
| **Merchant intelligence** | AI alias/category suggestions | AI-006 |
| **Recommendation audit** | AI summary of audit trail for support | AI-004 |

---

## 4.5 Assistant & copilot (later)

| Feature | Milestone | Constraints |
|---------|-----------|-------------|
| **Read-only Q&A** | AI-011 (was M-065) | RAG over catalog + user portfolio; tool calls to reco API |
| **Financial copilot** | M-066–M-071 | Tools only; no write actions without explicit user confirm |
| **Extension contextual help** | M-032 | Short AI tip on detected merchant |

---

## 4.6 Analytics & ops

| Use | AI role |
|-----|---------|
| **PostHog insight summaries** | Weekly AI digest for product team |
| **Support triage** | Classify user issues (internal) |
| **Eval regression reports** | AI-judged explanation quality scores in CI |

---

# 5. AI Platform Track — Milestones (AI-001 – AI-012)

> **Priority:** Execute **AI-001 through AI-005** before **M-029**.  
> **Gate AI-G1:** AI-005 complete → unlocks M-029 and public “AI-native” branding.

| ID | Name | Deliverables | Depends | Enables |
|----|------|--------------|---------|---------|
| **AI-001** | AI Platform Foundation | `packages/ai`, env config, gateway client, `AiRun` logging, base flags | M-004, M-005 | All AI work |
| **AI-002** | Prompt Registry & Admin | Prompt versions in DB/admin, model routing config, AI runs UI | AI-001 | AI-003+ |
| **AI-003** | AI Catalog Ingestion | Fetch + AI structure → import queue; deprecate crawl-as-primary | AI-001, M-011 import schema | India catalog |
| **AI-004** | AI Recommendation Explanations | Grounded NL explanations on reco API + web UI breakdown | AI-001, M-018 | AI-native reco UX |
| **AI-005** | Eval Harness & Safety | 20+ golden scenarios, CI eval, number-mismatch guards, fallbacks | AI-003, AI-004 | **AI-G1** |
| **AI-006** | Smart Insights | Proactive insight objects + AI narrative (dashboard/notifications) | AI-004, M-028 | M-029 content |
| **AI-007** | AI Ranking Signals | Preference signal suggestions; capped influence on M-027 ranker | AI-004, M-027 | M-063 (partial) |
| **AI-008** | Embeddings & Semantic Search | Card/merchant embeddings, `/search/ai` API, catalog NL search | AI-001, M-006 | M-064 (partial) |
| **AI-009** | RAG & Context Engine | User context assembly, retrieval pipeline for Q&A | AI-008, M-028 | AI-011 |
| **AI-010** | Knowledge Graph (optional) | Entity graph for cards↔merchants↔offers if needed beyond RAG | AI-009 | M-057 (partial) | **Verified** |
| **AI-011** | Read-Only AI Assistant | Chat UI, tools: `getRecommendation`, `listCards`, RAG | AI-009, AI-004 | M-065 |
| **AI-012** | AI Branding & UX | “AI-organized”, “AI-explained” badges, marketing copy, docs | AI-G1 | **Verified** |

### Relationship to M-057–M-065 (original AI phase)

| Original | Disposition |
|----------|-------------|
| M-057 Knowledge Graph | **Delivered** → AI-010 (Prisma-backed entity graph + RAG enrichment) |
| M-058 Vector DB | **Moved up** → AI-008 |
| M-059 RAG | **Moved up** → AI-009 |
| M-060 Context Engine | **Merged** → AI-009 |
| M-061 AI Explanations | **Moved up** → AI-004 |
| M-062 Smart Insights | **Moved up** → AI-006 |
| M-063 Reco V4 | **Split** → AI-007 (signals) + existing M-027 |
| M-064 Universal Search | **Moved up** → AI-008 |
| M-065 AI Assistant | **Moved up** → AI-011 |

M-057–M-065 remain in master plan as **reference** but execution follows **AI-001–AI-012** first.

---

# 6. Infrastructure & credentials

## 6.1 Recommended provider stack (side-project / portable BYOK)

**Goal:** One billed AI account you own — usable in CardWise, Claude CLI, Cursor BYOK, other side projects. If CardWise is paused, the key still has value.

| Component | Recommendation | Notes |
|-----------|----------------|-------|
| **Default provider** | **Google Gemini** (`AI_PROVIDER=gemini`) | `@google/genai` SDK; default model `gemini-flash-latest` |
| **Alt portable** | **OpenAI** or **Anthropic** | Set `AI_PROVIDER=openai` / `anthropic` + provider-specific API key |
| **SDK** | `@google/genai` (Gemini) + Vercel AI SDK for optional OpenAI/Anthropic adapters | Structured output via Zod JSON schema |
| **Hosting** | API stays on AWS | Keys are yours; no platform lock-in |
| **Not default** | Vercel AI Gateway, OpenRouter | Optional later; not required |

### Provider adapter pattern (AI-001)

All model calls go through `generateStructured()` / `generatePlainText()` — feature modules never hardcode a vendor:

```typescript
// packages/ai/src/structured.ts — routes by AI_PROVIDER
// gemini → @google/genai singleton (packages/ai/src/gemini/)
// openai | anthropic → Vercel AI SDK (packages/ai/src/providers/)
```

Feature code only calls `generateStructured()` — provider is opaque.

**Switching providers:** change env + restart. No task-logic rewrite.

## 6.2 Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `AI_PROVIDER` | Yes | `gemini` (default) \| `openai` \| `anthropic` |
| `GEMINI_API_KEY` | If `gemini` | Google AI Studio API key |
| `GEMINI_MODEL` | Optional | Default model (default `gemini-flash-latest`) |
| `AI_API_KEY` | Alt | Generic key alias when `AI_PROVIDER=gemini` |
| `OPENAI_API_KEY` | Alt | Used if `AI_PROVIDER=openai` and `AI_API_KEY` unset |
| `ANTHROPIC_API_KEY` | Alt | Used if `AI_PROVIDER=anthropic` and `AI_API_KEY` unset |
| `AI_DEFAULT_FAST_MODEL` | Optional | Cheap/fast model tier override |
| `AI_DEFAULT_QUALITY_MODEL` | Optional | Better model for user-facing explanations |
| `AI_DEFAULT_EMBEDDING_MODEL` | Optional | Embeddings (AI-008) |
| `AI_MONTHLY_BUDGET_USD` | Optional | Soft alert only (default `50`) — billing is on the provider console |

Add to `.env.example` (no real values):

```bash
# AI Platform (AI-001)
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
AI_DEFAULT_FAST_MODEL=gemini-flash-latest
AI_DEFAULT_QUALITY_MODEL=gemini-flash-latest
AI_MONTHLY_BUDGET_USD=50
```

**Examples:**

```bash
# A) Gemini (default)
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-latest

# B) OpenAI — same key as ChatGPT API / other apps
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_DEFAULT_FAST_MODEL=gpt-4.1-mini
AI_DEFAULT_QUALITY_MODEL=gpt-4.1

# C) Anthropic — same key as Claude CLI / Cursor BYOK
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_DEFAULT_FAST_MODEL=claude-haiku-4-5
AI_DEFAULT_QUALITY_MODEL=claude-sonnet-4-6
```

Admin prompt registry (AI-002) may override per-task model **within** the active provider/host.

## 6.3 Model routing policy

| Task | Model tier | Why |
|------|------------|-----|
| Catalog structuring | **Fast** | High volume, JSON output, cost-sensitive |
| Merchant alias suggest | **Fast** | Batch admin task |
| Reco explanation | **Quality** | User-facing prose, nuance |
| Assistant / RAG answer | **Quality** | Multi-step reasoning |
| Embeddings | **Embedding model** via gateway | e.g. `openai/text-embedding-3-small` |

Always set **temperature 0–0.2** for structuring; **0.3–0.5** for explanations.

## 6.4 Cost controls

| Control | Implementation |
|---------|----------------|
| Per-task token limits | `maxTokens` in `packages/ai` |
| Rate limits | Redis counter per user/admin job |
| Batch catalog | **BullMQ worker** — see [`WORKER_PLATFORM_PLAN.md`](./WORKER_PLATFORM_PLAN.md) (W-001/W-002) |
| Caching | Hash input → cache structured output 24h |
| Budget alerts | CloudWatch + gateway dashboard |

**Rough estimate (early):** ~26 cards × ~8k tokens/card ingest ≈ 200k tokens/bank run ≈ **&lt;$1–3/bank** on fast models; reco explanations ~1–2k tokens/request.

## 6.5 Privacy & compliance

| Topic | Approach |
|-------|----------|
| **Data residency** | LLM requests may leave India — disclose in privacy policy (`docs/22`) |
| **PII in prompts** | Never send email/phone; user context = card slugs, prefs, anonymized ids |
| **Logging** | Store prompt hash + output; redact PII; retain 90 days |
| **User opt-out** | Flag to disable AI explanations per user (settings) |
| **Catalog** | AI output never auto-published |

## 6.6 Alternatives considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Google Gemini (default)** | Official SDK; fast flash models; simple env | Google-specific billing | ✅ **Default** |
| **Anthropic direct (BYOK)** | Same key → Claude CLI, Cursor BYOK | Anthropic-only models | ✅ **Alt provider** |
| **OpenAI direct** | Portable; widely supported | OpenAI-only models | ✅ **Alt provider** |
| **AWS Bedrock** | AWS-native | Enterprise-ish setup | Optional later |
| **Vercel AI Gateway / OpenRouter** | Multi-model one key | Extra product; less reusable elsewhere | ❌ Not default |
| **Cursor Ultra / Cursor API** | Great for building in Cursor | Not app inference | ❌ Dev tooling only — §6.7 |

## 6.7 Cursor Ultra — not an app runtime provider

**Short answer: No.** Cursor Ultra cannot power CardWise’s in-app AI. Use it to *build* the app; use **your Anthropic/OpenAI key** to *run* AI features.

| Cursor Ultra | Your Anthropic (or OpenAI) key |
|--------------|--------------------------------|
| IDE agent usage | App + CLI + other projects |
| Stays with Cursor | Survives if CardWise is abandoned |
| Cloud Agents = coding automation | `generateObject` for catalog / reco / chat |

**Portability rule:** Prefer keys and hosts you would keep even if this repo is archived.

---

# 7. Catalog ingest pivot (discard crawl-as-primary)

## 7.1 What we keep

- `CatalogImportBatch` / `CatalogImportItem` staging + admin review (M-011 pattern)
- Official `sourceUrl` on every entity
- Approve → Publish workflow
- Deterministic **fetch** (HTTP download, sitemap discovery)

## 7.2 What we deprecate

- Bulk synthetic India catalog (`150 cards` rule-based expansion)
- Rule-based parser as **primary** (keep as **fallback** in `packages/catalog-ingest`)
- Pending import queue junk from old bulk loads — **purge in AI-003**

## 7.3 AI-003 acceptance criteria

- [ ] Admin triggers “AI ingest: IDFC FIRST Bank”
- [ ] Each card has: tags, structured fees, categorized highlights, approval summary
- [ ] Every field traceable to issuer URL
- [ ] Side-by-side: AI vs fallback parser in admin
- [ ] Eval: 5 golden IDFC cards pass schema + fee sanity checks
- [ ] **Migrate to worker queue** (W-002) — replace in-process ingest + batch polling UI

> **Interim (2026-07-11):** AI-003 ships with in-process background job + Import Center polling. **W-001/W-002** replaces this with BullMQ + unified `JobRun` API.

---

# 8. Feature flags (extend M-004)

Add to `packages/feature-flags/src/flags.ts`:

| Flag | Default | Purpose |
|------|---------|---------|
| `ai_platform_enabled` | `false` | Master kill switch |
| `ai_catalog_structuring_enabled` | `false` | AI-003 |
| `ai_explanations_enabled` | `false` | AI-004 |
| `ai_insights_enabled` | `false` | AI-006 |
| `ai_search_enabled` | `false` | AI-008 |
| `ai_assistant_enabled` | `false` | AI-011 (exists today) |
| `ai_ranking_signals_enabled` | `false` | AI-007 |

Env override pattern (existing): `CARDWISE_FLAG_AI_EXPLANATIONS_ENABLED=true`

---

# 9. Eval & quality (AI-005)

## 9.1 Golden datasets

| Dataset | Count | Validates |
|---------|-------|-----------|
| `catalog/idfc-golden.json` | 5–10 cards | Schema, fees, highlight categories |
| `reco/dining-golden.json` | 10 scenarios | Explanation mentions correct card + ₹ |
| `reco/travel-golden.json` | 5 scenarios | No hallucinated multipliers |

## 9.2 Automated checks

- Parsed ₹ amounts in explanation **must equal** audit JSON (±₹1 rounding)
- No reward multiplier in explanation unless present in rule payload
- Catalog output: `sourceUrl` required on every highlight
- CI job: `bun run --filter @cardwise/ai eval` on prompt version bump

---

# 10. Execution order (updated)

```text
M-028 ✅ User Preferences
        ↓
AI-001  AI Platform Foundation
        ↓
AI-002  Prompt Registry & Admin
        ↓
AI-003  AI Catalog Ingestion (IDFC first bank)
        ↓
AI-004  AI Recommendation Explanations
        ↓
AI-005  Eval Harness & Safety  ──► AI-G1 gate
        ↓
M-029   Personalized Dashboard (AI insight slots ready via AI-006 or stub)
        ↓
M-030 … M-034 (personalization phase continues)
        ↓
AI-006 … AI-012 (parallel where possible)
        ↓
M-035+  Productivity (existing plan)
```

**M-029 is blocked until AI-G1** (AI-001–AI-005 verified).

---

# 11. Branding & product positioning

| Surface | Copy pattern |
|---------|--------------|
| Catalog card | “AI-organized from official issuer page · Admin verified” |
| Recommendation | “Computed by CardWise · Explained with AI” |
| Assistant | “AI assistant · Read-only · Sources cited” |
| Settings | “Allow AI-enhanced explanations” (toggle) |

Marketing claim (accurate): **“India’s AI-native credit card intelligence platform”** — grounded in deterministic math + AI structure/explain.

---

# 12. Decisions (resolved 2026-07-10)

| # | Question | Decision |
|---|----------|----------|
| 1 | **AI provider** | **Google Gemini** default (`AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-flash-latest`); alt OpenAI/Anthropic via env. No Vercel Gateway |
| 2 | **Catalog purge** | ✅ **Yes** — delete all pending import items; fresh start under AI-003 |
| 3 | **M-029 scope** | **Wait for AI-G1** (insight stub OK on dashboard) |
| 4 | **Budget cap** | Soft **$50/mo** alert; real billing on Anthropic/OpenAI console |
| 5 | ~~First bank after IDFC~~ | **N/A** — full data reset |
| 6 | **User-facing AI opt-out** | ✅ **Yes** — settings toggle before public beta |
| 7 | **Provider configurability** | ✅ `AI_PROVIDER` + `GEMINI_API_KEY` / provider-specific keys + `GEMINI_MODEL` |
| 8 | **Cursor Ultra for app AI** | ❌ **No** — IDE only; reuse Anthropic/OpenAI key for app + CLI |
| 9 | **Side-project constraint** | Prefer keys reusable outside CardWise; avoid enterprise-only stacks |
| 10 | **Operator playbook** | [`GEMINI_SETUP_AND_PROMPTS.md`](./GEMINI_SETUP_AND_PROMPTS.md) — account, prompts, best practices |

---

# 13. Definition of Done — AI-G1

- [x] `packages/ai` published in monorepo with tests
- [x] Gemini configured in staging; secrets in env
- [x] AI-003: ≥20 IDFC cards ingested via AI, admin-published to catalog
- [x] AI-004: Reco API returns AI explanation with calculation breakdown
- [x] AI-005: Eval CI green; zero hallucinated rates in golden set
- [x] Feature flags documented; all AI features default **off** except staging
- [x] Privacy note drafted for AI/LLM data processing — [`AI_LLM_PRIVACY.md`](./AI_LLM_PRIVACY.md)
- [x] Admin can view AI runs and prompt versions

---

# Appendix A — File checklist (AI-001)

| File | Action |
|------|--------|
| `packages/ai/package.json` | Create |
| `packages/ai/src/client.ts` | Provider factory + model routing |
| `packages/ai/src/gemini/` | `@google/genai` singleton + structured/text generation |
| `packages/ai/src/providers/` | Optional `anthropic`, `openai` Vercel AI SDK adapters |
| `packages/ai/src/structured.ts` | `generateStructured()` |
| `packages/ai/src/tasks/` | Per-task runners |
| `packages/ai/src/prompts/` | Versioned prompt templates |
| `packages/validation/src/ai/` | AI output schemas |
| `services/api/src/modules/ai/` | Nest module |
| `services/api/prisma/schema.prisma` | `AiRun`, `AiPromptVersion` |
| `.env.example` | AI vars |
| `plans/AI_INTEGRATION_PLAN.md` | This document |

---

# Appendix B — Related documents

| Document | Update needed |
|----------|---------------|
| `plans/00_MASTER_DEVELOPMENT_PLAN.md` | AI track + gate AI-G1 + M-029 block |
| `plans/AI_LLM_PRIVACY.md` | **Done** — LLM data processing privacy note |
| `plans/GEMINI_SETUP_AND_PROMPTS.md` | **Done** — account setup, prompts, best practices |
| `docs/09_AI_AND_RECOMMENDATION_ENGINE.md` | Cross-link AI-001–AI-012 |
| `packages/catalog-ingest/README.md` | Mark as fallback fetch/parser |
| `docs/22_DATA_PRIVACY_AND_GOVERNANCE.md` | LLM processing section |
