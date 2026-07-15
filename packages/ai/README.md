# @cardwise/ai — CardWise AI Platform

Google Gemini–backed structured AI tasks for CardWise.

## Env (`.env.local`)

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
# Optional tier overrides (default to GEMINI_MODEL):
# AI_DEFAULT_FAST_MODEL=gemini-flash-latest
# AI_DEFAULT_QUALITY_MODEL=gemini-flash-latest
```

`AI_API_KEY` is accepted as an alias for `GEMINI_API_KEY` when `AI_PROVIDER=gemini`.

## Eval harness (AI-005)

Offline golden checks (CI-safe, no API key):

```bash
bun run --filter @cardwise/ai eval
# or from repo root:
bun run ai:eval
```

Live eval against Gemini (optional):

```bash
bun run ai:eval:live
```

Golden datasets live in `src/eval/fixtures/`:
- `catalog/idfc-golden.json` — 5 IDFC reference bundles
- `reco/dining-golden.json` — 10 dining scenarios
- `reco/travel-golden.json` — 5 travel scenarios

## POC CLI

From repo root (after `bun install` + build):

```bash
bun run ai:poc ping
bun run ai:poc catalog
bun run ai:poc explain
bun run ai:poc all
```

See [`plans/GEMINI_SETUP_AND_PROMPTS.md`](../../plans/GEMINI_SETUP_AND_PROMPTS.md) for account setup.
