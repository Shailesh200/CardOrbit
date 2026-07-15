# @cardwise/jobs

Generic background job contracts for CardWise workers.

## Adding a new job type

1. Define payload schema and job metadata in `src/<domain>-jobs.ts`:

```ts
export const myJob = {
  type: 'domain.my-action',
  queue: 'domain',
  description: 'What this job does',
  estimatedMinutes: { min: 1, max: 10 },
  payloadSchema: z.object({ foo: z.string() }),
} satisfies JobDefinition<typeof payloadSchema, Progress, Result>;
```

2. Register in `src/registry.ts` (`JOB_REGISTRY`).

3. Implement runner in `@cardwise/job-runners`.

4. Add processor branch in `services/worker/src/main.ts`.

5. Optionally expose UI fields in `@cardwise/admin-config` (`optionSources`, Data sync page fields).

Jobs are enqueued via `POST /api/v1/admin/jobs` and progress streams on `GET /api/v1/admin/jobs/:id/events` (SSE + Redis pub/sub).
