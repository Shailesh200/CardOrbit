# Catalog ingest worker (planned)

> **Status:** Superseded by worker platform — see [`plans/WORKER_PLATFORM_PLAN.md`](../../plans/WORKER_PLATFORM_PLAN.md)  
> **Scheduled job milestone:** **W-005** (after W-001 foundation + W-002 AI ingest migration)

## Goal

Weekly automated refresh of India card/merchant catalog from **official issuer websites**, using the same admin review queue introduced in M-028.

## Architecture (target)

```text
Cron (weekly)
  → POST /admin/jobs { type: "catalog.scheduled-refresh", payload: { market: "IN" } }
  → services/worker (BullMQ)
      → enqueue per-bank catalog.ai-ingest jobs OR single multi-bank job
      → fetch + AI structure (or rule fallback)
      → diff vs last PUBLISHED snapshot (future)
      → insert CatalogImportItem (PENDING_REVIEW) for changes only
  → Admin Import Center (unchanged approve / reject / publish)
```

## Non-goals (v1 worker)

- No auto-publish without admin approval
- No scraping of sites that prohibit it in ToS
- No PDF T&C full-text parsing (link + summary only until dedicated parser milestone)

## Implementation notes

- Reuse `@cardwise/catalog-ingest` + `@cardwise/ai` via **`catalog.ai-ingest`** job processor (W-002)
- Store raw HTML hash in `CatalogImportBatch.metadata` for diff detection
- Per-bank adapter: discover URLs → AI structure (AI-003 path)
- Deploy worker container + cron trigger (not Vercel serverless for long AI batches)

## Related

- [`plans/WORKER_PLATFORM_PLAN.md`](../../plans/WORKER_PLATFORM_PLAN.md) — authority for queues/workers
- `packages/catalog-ingest/README.md`
- `services/api/src/modules/catalog-import/`
- Admin Import Center: `/import`
