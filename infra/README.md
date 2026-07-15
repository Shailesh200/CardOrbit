# Infrastructure

| Path | Purpose |
|------|---------|
| [`docker/docker-compose.yml`](docker/docker-compose.yml) | Local Postgres, Redis, Mailpit |
| [`docker/docker-compose.production.yml`](docker/docker-compose.production.yml) | Production stack (API, worker, scheduler, DB, Redis) |
| [`docker/Dockerfile.*`](docker/) | Production images |
| [`coolify/`](coolify/) | Coolify compose checklist |
| `terraform/` | Future AWS IaC (not MVP) |
| `kubernetes/` | Future EKS (not MVP) |

## Canonical docs

Start here: [`docs/14_DEPLOYMENT_STRATEGY.md`](../docs/14_DEPLOYMENT_STRATEGY.md)

MVP path: **Hetzner VPS + Coolify + Docker**, frontends on **Vercel**, assets on **Cloudflare R2**, email via **Resend**.

Enterprise-scale AWS/EKS narrative remains in `docs/14_SCALABILITY_AND_DEVOPS.md` (deferred).
