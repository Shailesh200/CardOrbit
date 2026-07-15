# Catalog ingest

Bank-by-bank crawlers that fetch **official issuer product pages**, stage card bundles for admin review, and publish into the live catalog.

## Current scope

| Bank | Status |
|------|--------|
| IDFC FIRST Bank | Live crawler (`idfc-first`) |
| Other issuers | Planned, one bank at a time |

Each **card bundle** includes:

- Card metadata + working `sourceUrl` (issuer product page)
- Benefits parsed from JSON-LD (with HTML fallback)
- Optional reward rule summary when multipliers are detected in issuer copy

## Commands

```bash
# Crawl IDFC FIRST Bank into admin review queue (requires DB + migration)
bun run --filter @cardwise/api catalog:ingest

# Or from Admin UI → Import Center → "Crawl IDFC FIRST cards"
```

**Workflow:** Crawl → **View** item details → Approve → Publish.

## Packages

| Path | Role |
|------|------|
| `packages/catalog-ingest/src/crawl/` | Per-bank crawlers |
| `packages/validation/catalog-ingest.ts` | Zod schemas |
| `services/api/.../catalog-import` | Staging tables, review API, publish service |

## Source URLs

All staged cards use real pages on `idfcfirst.bank.in` (not synthetic paths). Consumer web shows **View on issuer website** when `sourceUrl` is set.
