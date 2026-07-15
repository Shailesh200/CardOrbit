# CardWise — Gemini Setup & Prompt Playbook

Operator guide for the CardWise AI platform (`packages/ai`).

## Runtime

| Setting | Value |
|---------|--------|
| Provider | Google Gemini (`@google/genai`) |
| Default model | `gemini-flash-latest` |
| Env key | `GEMINI_API_KEY` |

## 1. Create an API key

1. Open [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key for your Google Cloud / AI Studio project
3. Copy the key — do **not** commit it to git

## 2. Configure CardWise

Add to `.env.local` (repo root):

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-flash-latest

# Feature flags (admin + API)
CARDWISE_FLAG_AI_PLATFORM_ENABLED=true
CARDWISE_FLAG_AI_CATALOG_STRUCTURING_ENABLED=true
CARDWISE_FLAG_AI_EXPLANATIONS_ENABLED=true
```

Optional tier overrides (default to `GEMINI_MODEL`):

```bash
AI_DEFAULT_FAST_MODEL=gemini-flash-latest
AI_DEFAULT_QUALITY_MODEL=gemini-flash-latest
AI_PING_MODEL=gemini-flash-latest
```

`AI_API_KEY` is accepted as an alias for `GEMINI_API_KEY` when `AI_PROVIDER=gemini`.

## 3. Smoke test

From repo root after `bun install` and building `@cardwise/ai`:

```bash
bun run ai:poc ping
```

Or use the admin **AI Platform** page → **Ping Gemini**.

## 4. Prompt registry

Versioned prompts live in `packages/ai/src/prompts/`:

| Feature | Version | Purpose |
|---------|---------|---------|
| `ping` | v1.0.0 | Connectivity check |
| `catalog-structure` | v1.0.0 | HTML → structured card bundle |
| `reco-explain` | v1.0.0 | Grounded recommendation copy |

Global safety rules: `packages/ai/src/prompts/constitution.ts`.

## 5. Swapping providers later

The `generateStructured` / `generatePlainText` abstraction in `packages/ai/src/structured.ts` routes by `AI_PROVIDER`:

- `gemini` (default) → `@google/genai` singleton
- `openai` / `anthropic` → Vercel AI SDK adapters (optional, for future swaps)

Business logic in `services/api` should only import from `@cardwise/ai`, not provider SDKs directly.

## 6. Eval harness

```bash
bun run ai:eval          # offline golden checks (CI-safe)
bun run ai:eval:live     # live Gemini calls (requires GEMINI_API_KEY)
```

## Checklist

- [ ] `GEMINI_API_KEY` in `.env.local` / secrets manager (not git)
- [ ] `AI_PROVIDER=gemini` + `GEMINI_MODEL=gemini-flash-latest`
- [ ] `bun run ai:poc ping` succeeds
- [ ] Admin AI Platform shows **Connected**
- [ ] Feature flags enabled for the features you need
- [ ] Read [`AI_LLM_PRIVACY.md`](./AI_LLM_PRIVACY.md) before public beta
