# CardOrbit (CardWise)

**Financial Decision Intelligence Platform** — answers: *"Which card should I use right now?"*

Product brand: **CardOrbit** · Domain: **[cardorbit.in](https://cardorbit.in)**  
Internal monorepo / npm scope: `@cardwise/*` (legacy name kept for packages).

CardOrbit is a milestone-driven platform for Indian credit card optimization — recommendations, rewards, travel, and AI-assisted decisioning.

---

## Production (live)

| Surface | URL |
|---------|-----|
| Landing | https://cardorbit.in |
| Consumer app | https://app.cardorbit.in |
| Admin CMS | https://admin.cardorbit.in |
| API health | https://api.cardorbit.in/health |
| API (base) | https://api.cardorbit.in/api/v1 |

### Infrastructure links

| System | Link / location | Role |
|--------|-----------------|------|
| **GitHub** | https://github.com/Shailesh200/CardOrbit | Source of truth (`main`) |
| **Vercel — web** | Vercel dashboard → `cardorbit-web` · root `apps/web` | Landing + consumer SPA |
| **Vercel — admin** | Vercel dashboard → `card-orbit-admin` · root `apps/admin` | Admin CMS SPA |
| **Coolify** | http://167.233.223.123:8000 | Deploy/manage API stack on VPS |
| **Coolify app** | Coolify → project → application `hoci5uux0n03wivuoxcj9awv` | Compose: api, worker, scheduler, postgres, redis |
| **Hetzner VPS** | `167.233.223.123` (SSH: `~/.ssh/cardorbit_hetzner`) | Docker host for Coolify |
| **Cloudflare** | https://dash.cloudflare.com → `cardorbit.in` | DNS / CDN |
| **Resend** | https://resend.com/domains · domain `cardorbit.in` | Transactional email (SMTP) |
| **Google Cloud OAuth** | https://console.cloud.google.com/apis/credentials | Google sign-in + Gmail scopes |
| **Gemini / AI Studio** | https://aistudio.google.com/apikey | `GEMINI_API_KEY` for API/worker |
| **GHCR images** | `ghcr.io/shailesh200/cardorbit-{api,worker,scheduler}` | Production container images |

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

Coolify UI: **http://167.233.223.123:8000**  
Compose data dir: `/data/coolify/applications/hoci5uux0n03wivuoxcj9awv/`

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
