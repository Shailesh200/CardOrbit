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
- No general-purpose PDF parsing — MITC/T&C/fee-schedule PDFs are a **secondary** source
  only (see below); scanned/image-only PDFs and exotic encodings are not supported

## MITC / PDF as secondary source

Product pages frequently link to a MITC (Most Important Terms & Conditions), T&C, Key Fact
Statement, or fee-schedule PDF. These links are captured as `sourceDocuments` on the staged
`IngestCardBundle` (`packages/validation/src/catalog-ingest.ts`) for reviewer corroboration —
shown in Import Center — but are **not** persisted when a card is published; the HTML product
page remains the primary source of truth.

- `extractSourceDocumentLinks` (`@cardwise/catalog-ingest`) scans the full product page HTML
  for MITC/T&C/KFS/fee-schedule/PDF links, independent of the discovery exclusion lists that
  stop those same URLs from being crawled *as if they were product pages*.
- `fetchPdf` (`@cardwise/catalog-ingest`, in `crawl/http.ts`) fetches a URL and only treats it
  as a PDF if the response body starts with the `%PDF-` magic bytes — the `Content-Type`
  header is informational only, since issuer CDNs sometimes mislabel responses.
- `extractPdfText` / `fetchAndExtractPdfText` (`crawl/pdf.ts`) is a minimal, dependency-free
  text extractor (inflates FlateDecode content streams, reads `Tj`/`TJ` text operators) —
  "good enough" to corroborate fee/reward sentences, not a general PDF parser.
- The AI ingest runner (`catalog-ai-ingest.runner.ts`) fetches the first MITC/PDF candidate
  found on the page and passes its extracted text into the **same** AI structuring call as
  secondary evidence (a combined prompt, not a second AI call), explicitly instructed to use
  it only to corroborate fees/reward rates already suggested by the HTML page.
- If AI structuring returns an empty `rewardRules` array but the rule-based fallback parser
  found one, the fallback's `rewardRules` are merged into the staged bundle rather than
  shipping an empty array (see `mergeAiRewardRules`).

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
