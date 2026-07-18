# Catalog ingest

Bank-by-bank crawlers that fetch **official issuer product pages**, stage card bundles for admin review, and publish into the live catalog.

## Current scope

Every bank in `INDIA_BANK_SOURCES` (`src/india/bank-sources.ts`) has a registered
`BankCrawlerAdapter` (`src/crawl/adapters/`) — the interface for a per-bank deep crawler.

| Bank | Adapter | Discovery + parse |
|------|---------|--------------------|
| IDFC FIRST Bank (`idfc-first`) | `idfc-first.adapter.ts` | Dedicated deep crawler — heading/fee/eligibility extraction (`idfc-first.ts` + `idfc-html.ts`) |
| Every other bank (HDFC, ICICI, SBI, Axis, Kotak, Yes Bank, IndusInd, BOB, PNB, Standard Chartered, Citi, RBL, AU, HSBC) | `<bank>.adapter.ts` via `createGenericBankAdapter` | Hardened generic catalog-listing discovery + JSON-LD/HTML-fallback product page parser |

Adding a bank to `bank-sources.ts` without registering a matching adapter module in
`src/crawl/adapters/registry.ts` fails fast at import time — every bank must be explicitly
registered.

Each **card bundle** includes:

- Card metadata + working `sourceUrl` (issuer product page)
- Benefits parsed from JSON-LD (with HTML fallback)
- Optional reward rule summary when multipliers are detected in issuer copy
- MITC / T&C / schedule-of-charges document links (`sourceDocuments`), captured as secondary
  evidence via `extractSourceDocuments` / `extractSourceDocumentLinks`

## BankCrawlerAdapter

Every bank adapter (`src/crawl/adapter.ts`) implements:

```ts
interface BankCrawlerAdapter {
  readonly bankSlug: string;
  readonly bankName: string;
  readonly baseUrl: string;
  readonly catalogUrl: string;

  discoverCardUrls(): Promise<string[]>;
  parseProductPage(input: { sourceUrl: string; html: string }): IngestCardBundle | null;
  extractSourceDocuments(input: { sourceUrl: string; html: string }): IngestSourceDocument[];
}
```

- `idfc-first` implements this by wrapping the dedicated deep parser.
- Every other bank implements this via `createGenericBankAdapter(bankSource)`, backed by
  `discoverGenericBankCardUrls` + `parseGenericCardPage`.
- `discoverBankCardUrls` (AI ingest) and `crawlBankCards` (rule-based crawl) both route
  through `getBankCrawlerAdapter(bankSlug)` rather than a bank-specific switch statement.

## Commands

```bash
# Crawl IDFC FIRST Bank into admin review queue (requires DB + migration)
bun run --filter @cardwise/api catalog:ingest

# Or from Admin UI → Import Center → "Crawl IDFC FIRST cards"

# Run the catalog-ingest test suite (adapter interface + fixture parsing)
bun run --filter @cardwise/catalog-ingest test
```

**Workflow:** Crawl → **View** item details → Approve → Publish.

## Packages

| Path | Role |
|------|------|
| `packages/catalog-ingest/src/crawl/adapter.ts` | `BankCrawlerAdapter` interface |
| `packages/catalog-ingest/src/crawl/adapters/` | Per-bank adapters + explicit registry |
| `packages/catalog-ingest/src/crawl/` | Discovery, JSON-LD/HTML parsing, PDF/source-document extraction |
| `packages/validation/catalog-ingest.ts` | Zod schemas |
| `services/api/.../catalog-import` | Staging tables, review API, publish service |

## Tests

`src/crawl/adapters/adapters.test.ts` iterates every registered adapter and asserts:

- The registry has exactly one adapter per `INDIA_BANK_SOURCES` entry, matching the
  `BankCrawlerAdapter` shape.
- `discoverCardUrls()` finds product URLs from a fixture catalog-listing page (network-free —
  `fetch` is stubbed with fixture HTML).
- `parseProductPage()` parses a fixture product page (shared JSON-LD fixture builder) into a
  valid card bundle.
- `extractSourceDocuments()` finds MITC/schedule-of-charges links on a fixture product page.

## Source URLs

IDFC FIRST staged cards use real pages on `idfcfirst.bank.in` (not synthetic paths). Every
other bank stages candidates discovered from its official catalog listing in
`bank-sources.ts`. Consumer web shows **View on issuer website** when `sourceUrl` is set.
