# CardOrbit (CardWise)

**Financial Decision Intelligence Platform** — answers: *"Which card should I use right now?"*

Product brand: **CardOrbit** · Domain: **[cardorbit.in](https://cardorbit.in)**  
Internal monorepo / npm scope: `@cardwise/*` (legacy name kept for packages).

CardOrbit is a milestone-driven platform for Indian credit card optimization — recommendations, rewards, travel, and AI-assisted decisioning.

---

## Ops bookmarks (check regularly)

Exact links for day-to-day tracking of CardOrbit production. Bookmark this section.

### Product surfaces

| What | Exact URL |
|------|-----------|
| Landing | https://cardorbit.in |
| Privacy | https://cardorbit.in/privacy |
| Terms | https://cardorbit.in/terms |
| Cookies | https://cardorbit.in/cookies |
| Sitemap | https://cardorbit.in/sitemap.xml |
| Robots | https://cardorbit.in/robots.txt |
| Consumer app | https://app.cardorbit.in |
| App login | https://app.cardorbit.in/login |
| App signup | https://app.cardorbit.in/signup |
| Admin CMS | https://admin.cardorbit.in |
| API health | https://api.cardorbit.in/health |
| API base | https://api.cardorbit.in/api/v1 |

### Analytics (PostHog · US · project `519148`)

| What | Exact URL |
|------|-----------|
| Project home | https://us.posthog.com/project/519148 |
| Activity (live events) | https://us.posthog.com/project/519148/activity |
| Persons | https://us.posthog.com/project/519148/persons |
| Dashboards | https://us.posthog.com/project/519148/dashboard |
| Product analytics | https://us.posthog.com/project/519148/insights |
| Web analytics | https://us.posthog.com/project/519148/web |
| Session replay | https://us.posthog.com/project/519148/replay/home |
| Project settings | https://us.posthog.com/project/519148/settings/project |

### Errors (Sentry)

| What | Exact URL |
|------|-----------|
| Sentry home | https://sentry.io |
| Org (example slug) | https://sentry.io/organizations/shailesh-jha/ |
| Projects to watch | `cardorbit-web`, `cardorbit-admin`, `cardorbit-api`, `cardorbit-worker` |

Open each project from the org home after login (slug may differ if you renamed the org).

### Deploys & source

| What | Exact URL |
|------|-----------|
| GitHub repo | https://github.com/Shailesh200/CardOrbit |
| GitHub Actions | https://github.com/Shailesh200/CardOrbit/actions |
| Deploy workflow | https://github.com/Shailesh200/CardOrbit/actions/workflows/deploy.yml |
| GHCR packages | https://github.com/Shailesh200/CardOrbit/pkgs/container/ |
| Vercel dashboard | https://vercel.com/dashboard |
| Vercel — web project | https://vercel.com → project **`card-orbit-web`** (root `apps/web`) |
| Vercel — admin project | https://vercel.com → project **`card-orbit-admin`** (root `apps/admin`) |
| Coolify UI | http://167.233.223.123:8000 |
| Coolify app id | `hoci5uux0n03wivuoxcj9awv` (api, worker, scheduler, postgres, redis) |
| Coolify compose dir | `/data/coolify/applications/hoci5uux0n03wivuoxcj9awv/` |

### Database & Redis (on VPS via Coolify)

Postgres and Redis run as Docker services on the Hetzner VPS (not a public URL).

| What | How to open |
|------|-------------|
| Coolify stack | http://167.233.223.123:8000 → application `hoci5uux0n03wivuoxcj9awv` → **postgres** / **redis** |
| SSH to VPS | `ssh -i ~/.ssh/cardorbit_hetzner root@167.233.223.123` |
| Postgres CLI | `cd /data/coolify/applications/hoci5uux0n03wivuoxcj9awv && docker compose exec -it postgres psql -U cardorbit -d cardorbit` |
| Redis CLI | `cd /data/coolify/applications/hoci5uux0n03wivuoxcj9awv && docker compose exec -it redis redis-cli` |
| DB name / user | database `cardorbit` · user `cardorbit` (password in Coolify env) |

### Infra & vendor consoles

| What | Exact URL |
|------|-----------|
| Hetzner Cloud | https://console.hetzner.cloud/ |
| VPS IP | `167.233.223.123` (server `cardorbit-api`, project `cardorbit-prod`) |
| Cloudflare dashboard | https://dash.cloudflare.com |
| Cloudflare DNS (`cardorbit.in`) | https://dash.cloudflare.com → select zone **cardorbit.in** → **DNS** |
| Cloudflare R2 | https://dash.cloudflare.com → **R2** (bucket `cardorbit-assets`) |
| Resend domains | https://resend.com/domains |
| Resend emails / logs | https://resend.com/emails |
| Google OAuth credentials | https://console.cloud.google.com/apis/credentials |
| Gemini API keys | https://aistudio.google.com/apikey |

### Host map

```text
cardorbit.in / www     → Vercel (landing)
app.cardorbit.in       → Vercel (consumer app)
admin.cardorbit.in     → Vercel (admin)
api.cardorbit.in       → Hetzner / Coolify / Traefik → API :3000
assets.cardorbit.in    → Cloudflare R2 (when configured)
```

### Production ops docs

| Doc | Purpose |
|-----|---------|
| [`docs/14_DEPLOYMENT_STRATEGY.md`](docs/14_DEPLOYMENT_STRATEGY.md) | Canonical MVP deploy architecture |
| [`docs/14C_COOLIFY_SETUP.md`](docs/14C_COOLIFY_SETUP.md) | Coolify + Traefik HTTPS fix |
| [`docs/14E_ENVIRONMENT_CONFIGURATION.md`](docs/14E_ENVIRONMENT_CONFIGURATION.md) | Env var map |
| [`docs/14J_OPERATIONAL_RUNBOOK.md`](docs/14J_OPERATIONAL_RUNBOOK.md) | Incidents / smoke tests |
| [`plans/PRODUCTION_DEPLOYMENT_CHECKLIST.md`](plans/PRODUCTION_DEPLOYMENT_CHECKLIST.md) | Step-by-step go-live checklist |
| [`.env.production.example`](.env.production.example) | Coolify env template (no secrets) |
| [`infra/docker/docker-compose.production.yml`](infra/docker/docker-compose.production.yml) | Production compose |
| [`infra/docker/scripts/patch-coolify-traefik.py`](infra/docker/scripts/patch-coolify-traefik.py) | Re-apply Traefik labels after Coolify recreate |

### Coolify / VPS quick commands

```bash
# SSH
ssh -i ~/.ssh/cardorbit_hetzner root@167.233.223.123

# API health (public)
curl -sS https://api.cardorbit.in/health

# If HTTPS to api.* times out after Coolify recreate:
python3 /opt/cardorbit-src/infra/docker/scripts/patch-coolify-traefik.py
cd /data/coolify/applications/hoci5uux0n03wivuoxcj9awv
docker compose up -d --force-recreate --no-deps api
```

---

## Repository structure

```text
CardWise/
├── apps/                 # web, admin, extension, mobile
├── services/             # API (Nest/Fastify), worker, scheduler
├── packages/             # Shared @cardwise/* libraries
├── infra/                # Docker, Coolify helpers, Terraform (future)
├── scripts/              # Setup / seed / codegen
├── docs/                 # Product + architecture
├── plans/                # Master development plan + deploy checklist
├── .github/              # CI / deploy workflows
├── turbo.json
└── package.json          # Bun workspaces
```

## Technology stack

| Layer | Choice |
|-------|--------|
| Frontend | Vite 6 + React 19 + React Router v7 + Zustand + TanStack Query + shadcn/ui |
| Backend | NestJS 11 on Fastify + Prisma + PostgreSQL 16 + Redis + BullMQ |
| AI | Google Gemini (`packages/ai`) |
| Analytics / flags | PostHog (optional in prod) |
| Email | Resend SMTP |
| **Prod hosting (MVP)** | **Vercel** (web/admin) · **Hetzner + Coolify** (API stack) · **Cloudflare** (DNS) |
| Monorepo | Bun workspaces + Turborepo |
| Lint / format | Oxlint + Oxfmt |
| Git hooks | Lefthook |

> Long-term AWS/EKS notes remain in older docs; **MVP production path is Coolify/Vercel** — see [`docs/14_DEPLOYMENT_STRATEGY.md`](docs/14_DEPLOYMENT_STRATEGY.md).

## Prerequisites

- **Bun** 1.3+ ([install](https://bun.sh))
- **Docker** — [Colima](https://github.com/abiosoft/colima) + Docker CLI, or Docker Desktop
- **Node.js** 22+ (for NestJS/Vite runtime; see `.nvmrc`)

## Getting started

### macOS without Docker Desktop (Colima)

```bash
brew install colima docker docker-compose
colima start --cpu 4 --memory 6
```

### First-time setup

```bash
bun run setup

# Or manual:
bun install
cp .env.example .env.local   # edit if needed
bun run docker:up

bun run verify:milestone
bun run verify:web          # Lighthouse + SEO (when working on apps/web)
```

### Local services (after `docker:up`)

| Service | URL / Port |
|---------|------------|
| PostgreSQL | `localhost:5433` — database `cardwise_dev` |
| Redis | `localhost:6379` |
| Mailpit UI | http://localhost:8025 |
| API | http://localhost:3000 — `bun run dev:api` |
| Swagger | http://localhost:3000/api/docs |
| Web | http://localhost:5173 — `bun run dev:web` |
| Admin | http://localhost:5174 — `bun run dev:admin` |

```bash
bun run db:migrate
bun run dev          # Infra + API, web, admin
```

## Development governance

- **Roadmap:** [`plans/00_MASTER_DEVELOPMENT_PLAN.md`](plans/00_MASTER_DEVELOPMENT_PLAN.md)
- **Bootstrap:** [`docs/23_CURSOR_PROJECT_BOOTSTRAP_PLAN.md`](docs/23_CURSOR_PROJECT_BOOTSTRAP_PLAN.md)
- **Toolchain ADR:** [`docs/adr/ADR-048-monorepo-toolchain-bun-oxc.md`](docs/adr/ADR-048-monorepo-toolchain-bun-oxc.md)

### Git workflow

- **Pre-commit (Lefthook):** oxlint fix, oxfmt, typecheck on staged files
- **Commit-msg:** subject line ≤ 100 characters
- **Milestone gate:** `bun run verify:milestone` before shipping a milestone

## Package naming

- npm scope: `@cardwise/*`
- Apps: `@cardwise/web`, `@cardwise/admin`, `@cardwise/extension`
- Service: `@cardwise/api`

## License

Proprietary — All rights reserved.
