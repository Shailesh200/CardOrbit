# GitHub Automation

## CI (`workflows/ci.yml`)

Runs on push/PR to `main` and `develop`:

- `bun install --frozen-lockfile`
- `bun run verify:milestone` (lint, format, typecheck, build, tests, web SEO baseline, Lighthouse when `apps/web` changed)

## Deploy (`workflows/deploy.yml`)

Runs on push to `main` (and manual `workflow_dispatch`):

1. Quality gate (same milestone verify; can skip on emergency dispatch)
2. Build/push Docker images to GHCR: `api`, `worker`, `scheduler`
3. Trigger Coolify webhook + optional SSH migrate/restart

See [`docs/14D_CICD_PIPELINE.md`](../docs/14D_CICD_PIPELINE.md) and [`docs/14_DEPLOYMENT_STRATEGY.md`](../docs/14_DEPLOYMENT_STRATEGY.md).
