# CardOrbit Production Deployment Strategy

**Status:** Canonical for MVP production  
**Audience:** Solo developer / founding eng  
**Related:** [14A Infrastructure](14A_INFRASTRUCTURE_ARCHITECTURE.md) · [14B Docker](14B_DOCKER_DEPLOYMENT.md) · [14C Coolify](14C_COOLIFY_SETUP.md) · [14D CI/CD](14D_CICD_PIPELINE.md) · [14E Env](14E_ENVIRONMENT_CONFIGURATION.md) · [14J Runbook](14J_OPERATIONAL_RUNBOOK.md)

> Long-term enterprise AWS/EKS vision remains in `14_SCALABILITY_AND_DEVOPS.md`. **This document overrides that for the current MVP launch path.**

---

## Goals

- Production-ready with low cost and minimal DevOps
- Docker-first; Coolify on a single Hetzner VPS
- Frontends on Vercel; no Kubernetes; no serverless rewrite
- Preserve existing NestJS + Fastify API, BullMQ worker, Prisma, Redis architecture

---

## Target architecture

```text
Users ──► Cloudflare DNS/CDN
            ├─ app.*     → Vercel (consumer Vite SPA)
            ├─ admin.*   → Vercel (admin Vite SPA)
            ├─ api.*     → Hetzner VPS / Coolify → API container
            └─ assets.*  → Cloudflare R2

Chrome Web Store ← extension build (calls api.*)

Hetzner VPS (Coolify)
  ├─ api          NestJS / Fastify
  ├─ worker       BullMQ consumer
  ├─ scheduler    supercronic → API CLIs
  ├─ postgres     16 + pgvector
  └─ redis        7
```

| Layer | Choice |
|-------|--------|
| Consumer web / Admin | Vercel (static Vite builds) |
| Extension | Chrome Web Store |
| API + Worker + Scheduler | Docker on Hetzner via Coolify |
| Postgres / Redis | Docker on same VPS (Phase 1) |
| Uploads | Cloudflare R2 (S3-compatible) — not VPS disk |
| DNS / TLS / CDN | Cloudflare |
| Email | Resend (SMTP) |
| AI | Google Gemini (existing) |
| Errors | Sentry |
| Analytics | PostHog |
| CI/CD | GitHub Actions → GHCR → Coolify |

---

## What gets deployed

| Component | Where | Notes |
|-----------|--------|------|
| `@cardwise/web` | Vercel | Build with `VITE_API_URL` |
| `@cardwise/admin` | Vercel | Same API URL |
| `@cardwise/extension` | Chrome Web Store | Points at prod API |
| `@cardwise/api` | Coolify container | Health: `GET /health` |
| `@cardwise/worker` | Coolify container | Always-on BullMQ |
| Scheduler | Coolify container | Cron CLIs only (not BullMQ-in-API) |
| Postgres + Redis | Compose on VPS | Private network only |

---

## Release flow (summary)

1. Push to `main` → GitHub Actions lint/test  
2. Build/push `api`, `worker`, `scheduler` images to GHCR  
3. Coolify pulls / redeploys compose stack  
4. Run `prisma migrate deploy` (migrate profile or post-deploy)  
5. Restart API + worker + scheduler  
6. Vercel auto-deploys frontends (separate projects)  
7. Smoke tests — see [14J](14J_OPERATIONAL_RUNBOOK.md)

---

## Anti-patterns (do not)

- Kubernetes for MVP  
- Serverless rewrite of NestJS/BullMQ  
- Running BullMQ inside the API process  
- Local filesystem uploads in production  
- Manual `prisma migrate` on the box without a recorded release step  
- Production Swagger (`/api/docs`) exposed publicly  
- Secrets in git  
- Manual SSH `docker run` as the normal deploy path  
- Exposing Postgres/Redis ports to the internet  

---

## Document index

| Doc | Topic |
|-----|--------|
| [14A](14A_INFRASTRUCTURE_ARCHITECTURE.md) | Component diagram, networks, domains |
| [14B](14B_DOCKER_DEPLOYMENT.md) | Dockerfiles, compose, images |
| [14C](14C_COOLIFY_SETUP.md) | VPS + Coolify install |
| [14D](14D_CICD_PIPELINE.md) | GitHub Actions |
| [14E](14E_ENVIRONMENT_CONFIGURATION.md) | Env vars |
| [14F](14F_BACKUP_AND_RECOVERY.md) | Backups / restore |
| [14G](14G_MONITORING_AND_OBSERVABILITY.md) | Health, Sentry, metrics |
| [14H](14H_SCALING_STRATEGY.md) | Phase 1→4 |
| [14I](14I_SECURITY_HARDENING.md) | SSH, firewall, secrets |
| [14J](14J_OPERATIONAL_RUNBOOK.md) | Day-2 ops, rollback, smoke tests |

---

## Application follow-ups (out of scope for this docs/Docker pack)

These preserve architecture but are **required before claiming full production parity**:

1. ~~Wire `AssetStorageService` to S3-compatible R2~~ — done when `S3_*` / `AWS_*` are set.  
2. ~~Disable Swagger in `NODE_ENV=production`~~ — done.  
3. Confirm Resend SMTP credentials work with existing `MailService` (nodemailer).  

Env templates and compose assume R2 + Resend. Execution checklist: [`plans/PRODUCTION_DEPLOYMENT_CHECKLIST.md`](../plans/PRODUCTION_DEPLOYMENT_CHECKLIST.md).
