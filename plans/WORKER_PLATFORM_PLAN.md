# CardWise — Worker Platform Plan

> **Status:** Approved planning document  
> **Version:** 1.0  
> **Date:** 2026-07-11  
> **Authority:** Background jobs, queues, and long-running task orchestration  
> **Parent plan:** [`00_MASTER_DEVELOPMENT_PLAN.md`](./00_MASTER_DEVELOPMENT_PLAN.md)  
> **Replaces (interim):** In-process `void runJob()` + admin polling on `CatalogImportBatch.metadata` (AI-003 stopgap)

---

# 1. Problem

Several CardWise features run **minutes to hours**, not milliseconds:

| Task | Typical duration | Today (interim) |
|------|------------------|-----------------|
| AI catalog ingest (26 IDFC cards) | 40–60 min | In-process loop in API + UI polls batch metadata |
| AI eval harness (CI) | 5–15 min | Not built |
| Embeddings backfill | Hours | Not built |
| Weekly catalog refresh | 30+ min | Planned cron only |
| Bulk email / notification fan-out | Seconds–minutes | Synchronous or not built |
| GDPR data export | 1–5 min | Not built |

**Issues with HTTP-long-poll or in-process jobs:**

- API process owns work → restarts lose jobs, scaling duplicates work
- No unified job history, retry, or dead-letter semantics
- Each feature invents its own progress schema (`CatalogImportBatch.metadata`, etc.)
- Admin UI polls ad-hoc endpoints instead of one job contract

**Target:** Submit job → get `jobId` → worker runs → client observes **one** status stream → terminal result.

---

# 2. Decision

| Choice | Decision | Rationale |
|--------|----------|-----------|
| Queue | **BullMQ** on **Redis** | Already in master plan stack; Redis in local Docker Compose |
| Worker runtime | **Node/Bun process** in monorepo (`services/worker`) | Same TS packages as API (`@cardwise/ai`, `catalog-ingest`, Prisma) |
| API role | **Enqueue + read status only** | NestJS stays orchestration layer; never runs 60-min AI loops |
| Persistence | **Postgres `JobRun` + BullMQ job** | DB = audit/admin UI; Redis = execution queue |
| Client updates | **SSE first**, poll fallback | Admin gets push progress; mobile/web can poll same API |
| Rust/polyglot workers | **Deferred (FBI-001)** | CPU-bound reward batches only; LLM/IO jobs stay Node |

---

# 3. Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  Clients (Admin, Web, Cron triggers)                             │
│    POST /api/v1/jobs          → 202 { jobId }                    │
│    GET  /api/v1/jobs/:id      → status, progress, result         │
│    GET  /api/v1/jobs/:id/stream → SSE progress (optional)        │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  services/api — JobsModule                                       │
│    validate payload · create JobRun (QUEUED) · enqueue BullMQ    │
└────────────────────────────┬────────────────────────────────────┘
                             │ Redis
┌────────────────────────────▼────────────────────────────────────┐
│  services/worker — BullMQ Workers                                │
│    catalog.ai-ingest · ai.eval · notifications.send · …          │
│    update JobRun progress · domain side effects (Prisma, AI)     │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  PostgreSQL · Prisma · packages/*                                │
└─────────────────────────────────────────────────────────────────┘
```

### Request flow (AI catalog ingest example)

```text
Admin: "AI ingest IDFC"
  → POST /admin/jobs { type: "catalog.ai-ingest", payload: { bankSlug: "idfc-first" } }
  → API: JobRun QUEUED, BullMQ job added
  → 202 { jobId, statusUrl, streamUrl }

Worker picks job:
  → JobRun PROCESSING
  → for each card URL: structure + stage CatalogImportItem, progress { done: 3, total: 26 }
  → JobRun COMPLETED { batchId, itemCount, failedUrls }

Admin UI (JobTracker):
  → SSE or poll GET /jobs/:id until COMPLETED | FAILED
  → refresh Import Center queue
```

---

# 4. Monorepo layout

| Artifact | Path | Role |
|----------|------|------|
| Job contracts | `packages/jobs/` | Job type enum, Zod payloads, queue names, progress shapes |
| Worker app | `services/worker/` | BullMQ workers, processors, graceful shutdown |
| Jobs API | `services/api/src/modules/jobs/` | Enqueue, status, SSE, admin list |
| Persistence | `services/api/prisma` | `JobRun` model |
| Shared logic | existing packages | `@cardwise/ai`, `@cardwise/catalog-ingest`, etc. |

**Local dev:**

```bash
bun run dev:infra      # Postgres + Redis
bun run dev:api
bun run dev:worker     # new — consumes queues
bun run dev:admin
```

`scripts/dev.sh` should start worker alongside API when `WORKER_ENABLED=true` (default in dev).

---

# 5. Data model — `JobRun`

```prisma
enum JobRunStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  @@schema("admin")
}

model JobRun {
  id            String       @id @db.Uuid
  type          String       // e.g. catalog.ai-ingest
  status        JobRunStatus
  payload       Json
  progress      Json?        // { done, total, current, message, ... }
  result        Json?        // terminal output (batchId, counts, urls)
  errorCode     String?
  errorMessage  String?
  bullJobId     String?      @map("bull_job_id")
  triggeredBy   String?      @map("triggered_by")  // admin id | system | cron
  startedAt     DateTime?    @map("started_at")
  completedAt   DateTime?    @map("completed_at")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  @@index([type, createdAt(sort: Desc)])
  @@index([status])
  @@map("job_runs")
  @@schema("admin")
}
```

**Relationship to existing tables:**

- `AiRun` — per **LLM call** (unchanged); jobs *produce* many AiRuns
- `CatalogImportBatch` — domain batch; job `result.batchId` points here
- Remove progress fields from `CatalogImportBatch.metadata` once jobs own progress

---

# 6. Job catalog (use cases)

| Job type | Queue | Trigger | Progress unit | Enables |
|----------|-------|---------|---------------|---------|
| `catalog.ai-ingest` | `catalog` | Admin Import Center | cards processed / total | AI-003 |
| `catalog.crawl-fallback` | `catalog` | Admin (secondary) | same | M-028 fallback |
| `catalog.scheduled-refresh` | `catalog` | Cron weekly | banks / cards | [`CATALOG_INGEST_WORKER.md`](../docs/design/CATALOG_INGEST_WORKER.md) |
| `ai.eval` | `ai` | CI / admin | scenarios passed | AI-005 |
| `ai.embeddings-backfill` | `ai` | Admin / cron | entities indexed | AI-008 |
| `notifications.send-batch` | `notifications` | API / cron | messages sent | M-051 |
| `privacy.export-user` | `privacy` | User request | steps complete | M-013+ GDPR |
| `analytics.sync` | `ops` | Cron | dashboards synced | analytics package |

**Queue policy:**

| Queue | Concurrency | Rate limit | Notes |
|-------|-------------|------------|-------|
| `catalog` | 1 per bankSlug | 1 job / bank / 5 min | Avoid duplicate ingests |
| `ai` | 2 | Gemini budget | LLM-heavy |
| `notifications` | 10 | provider limits | Fast, idempotent |
| `privacy` | 2 | — | User-facing SLA |

---

# 7. API contract

### Enqueue (admin)

```http
POST /api/v1/admin/jobs
Authorization: Bearer …
Content-Type: application/json

{
  "type": "catalog.ai-ingest",
  "payload": { "bankSlug": "idfc-first", "purgePending": true, "limit": null }
}

→ 202 Accepted
{
  "jobId": "…",
  "status": "QUEUED",
  "statusUrl": "/api/v1/admin/jobs/…",
  "streamUrl": "/api/v1/admin/jobs/…/stream"
}
```

### Status

```http
GET /api/v1/admin/jobs/:id

{
  "id": "…",
  "type": "catalog.ai-ingest",
  "status": "PROCESSING",
  "progress": { "done": 3, "total": 26, "currentUrl": "…", "itemCount": 3 },
  "result": null,
  "errorMessage": null,
  "createdAt": "…",
  "startedAt": "…"
}
```

### SSE stream (phase W-002)

```http
GET /api/v1/admin/jobs/:id/stream

event: progress
data: {"done":3,"total":26,"itemCount":3}

event: completed
data: {"batchId":"…","itemCount":24,"failedUrls":[]}
```

### List / filter

```http
GET /api/v1/admin/jobs?type=catalog.ai-ingest&status=PROCESSING&limit=20
```

---

# 8. Worker implementation pattern

```typescript
// packages/jobs/src/catalog/ai-ingest.job.ts
export const CatalogAiIngestJob = {
  type: 'catalog.ai-ingest' as const,
  queue: 'catalog' as const,
  payloadSchema: z.object({
    bankSlug: z.string(),
    purgePending: z.boolean().optional(),
    limit: z.number().int().positive().optional(),
  }),
  progressSchema: z.object({
    done: z.number(),
    total: z.number(),
    currentUrl: z.string().nullable(),
    itemCount: z.number(),
  }),
  resultSchema: z.object({
    batchId: z.string().uuid(),
    itemCount: z.number(),
    failedUrls: z.array(z.string()),
  }),
};
```

```typescript
// services/worker/src/processors/catalog-ai-ingest.processor.ts
export async function processCatalogAiIngest(job: Job, ctx: WorkerContext) {
  await ctx.updateProgress({ done: 0, total: urls.length, … });
  // reuse CatalogAiIngestService logic (move to packages/jobs-runner or shared module)
  await ctx.complete({ batchId, itemCount, failedUrls });
}
```

**Retries:** 3 attempts, exponential backoff; card-level failures stay in `failedUrls` (no whole-job retry unless worker crash).

**Idempotency:** `jobId` + `entityKey` unique on import items; re-run job creates new batch.

**Cancellation:** `POST /admin/jobs/:id/cancel` → BullMQ `job.remove()` + cooperative check in processor loop.

---

# 9. Admin UI pattern

Replace per-feature polling with reusable **`JobTracker`**:

```text
Import Center
  [AI ingest IDFC] → POST /jobs → jobId
  ┌ JobTracker ─────────────────────────────┐
  │ catalog.ai-ingest · PROCESSING          │
  │ ████████░░░░░░░░  8/26 · 7 staged       │
  │ ~34 min remaining (est.)                │
  └─────────────────────────────────────────┘
  Queue table refreshes when progress.itemCount increases
```

**Jobs page (W-003):** `/admin/jobs` — history, filters, retry failed, link to AI runs / import batch.

---

# 10. Milestones — Worker track (W-001 – W-005)

| ID | Name | Deliverables | Depends | Replaces / enables |
|----|------|--------------|---------|-------------------|
| **W-001** | Worker Foundation | `packages/jobs`, `services/worker`, Redis/BullMQ wiring, `JobRun`, enqueue + status API | Redis (M-005), M-004 | All async work |
| **W-002** | Migrate AI catalog ingest | `catalog.ai-ingest` processor; Import Center uses JobTracker; remove in-process ingest | W-001, AI-003 | AI-003 interim polling |
| **W-003** | Admin Jobs UI + SSE | `/admin/jobs` list, SSE stream, cancel | W-001 | Operator visibility |
| **W-004** | Notifications worker | `notifications.send-batch` queue | W-001, M-051 | Sync email sends |
| **W-005** | Scheduled catalog refresh | Cron → enqueue `catalog.scheduled-refresh` | W-002 | Weekly ingest doc |

**Suggested order:** **W-001 → W-002** immediately after AI-003 stabilizes (or in parallel with AI-004).

**Gate W-G1:** AI ingest runs exclusively via worker; API restart does not lose in-flight ingest; admin sees job history.

---

# 11. Environment

```bash
# .env.local
REDIS_URL=redis://localhost:6379
WORKER_ENABLED=true
WORKER_CONCURRENCY_CATALOG=1
WORKER_CONCURRENCY_AI=2

# Optional — separate worker deployment in prod
WORKER_QUEUES=catalog,ai,notifications
```

Production: worker runs as **separate process/container** from API (same image, different entrypoint: `node dist/worker.js`).

---

# 12. Observability

| Signal | Implementation |
|--------|----------------|
| Job lag | BullMQ metrics + `JobRun` counts by status |
| Progress | SSE + structured logs (`jobId`, `type`, `done/total`) |
| LLM cost | Existing `AiRun` rows linked via `metadata.jobId` |
| Failures | Sentry on processor throw; dead-letter queue after max retries |
| Alerts | Queue depth > N for 10 min → ops (PostHog / future PagerDuty) |

---

# 13. Migration from AI-003 interim

Current code (`CatalogAiIngestService.startAiIngestJob` + `getAiIngestJobStatus` + Import Center poll loop):

| Step | Action |
|------|--------|
| 1 | Extract card loop into shared `runCatalogAiIngest(payload, onProgress)` |
| 2 | W-001: enqueue that function from worker processor |
| 3 | W-002: API endpoint becomes thin wrapper over `JobsService.enqueue` |
| 4 | Delete `activeJobs` in-memory set; use BullMQ stalled-job detection |
| 5 | Deprecate `GET …/batches/:id/ai-ingest-status` → `GET …/jobs/:id` |
| 6 | Import Center uses `JobTracker` component |

**No data migration** required — existing batches/items remain valid.

---

# 14. What we are not doing (v1)

- Separate microservice per job type
- Vercel serverless for long AI jobs (timeout limits)
- Rust workers (FBI-001 backlog)
- User-facing job UI (admin-only until privacy export needs it)
- BullMQ Pro / Redis Cluster (single Redis instance is fine for side-project scale)

---

# 15. Related documents

| Document | Update |
|----------|--------|
| [`docs/design/CATALOG_INGEST_WORKER.md`](../docs/design/CATALOG_INGEST_WORKER.md) | Scheduled ingest → W-005 |
| [`plans/AI_INTEGRATION_PLAN.md`](./AI_INTEGRATION_PLAN.md) | AI-003 note: migrate to W-002 |
| [`plans/00_MASTER_DEVELOPMENT_PLAN.md`](./00_MASTER_DEVELOPMENT_PLAN.md) | W-001–W-005 track |
| [`docs/14_SCALABILITY_AND_DEVOPS.md`](../docs/14_SCALABILITY_AND_DEVOPS.md) | Queue depth runbooks (already referenced) |

---

# 16. Definition of Done — W-G1

- [ ] `bun run dev:worker` consumes jobs locally with Redis
- [ ] AI catalog ingest enqueued via `POST /admin/jobs`; API returns in < 500 ms
- [ ] Worker survives API restart mid-ingest; job completes
- [ ] Admin Import Center shows unified job progress (no batch-metadata polling)
- [ ] Failed jobs visible in admin with error message + retry
- [ ] `JobRun` row for every enqueued job; `AiRun.metadata.jobId` links LLM calls
