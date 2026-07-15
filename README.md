# CardWise

**Financial Decision Intelligence Platform** — answers: *"Which card should I use right now?"*

CardWise is a milestone-driven platform for Indian credit card optimization, evolving from recommendation intelligence into a full financial operating system for rewards, travel, and AI-assisted optimization.

## Repository Structure

```text
CardWise/
├── apps/                 # Client applications (web, admin, extension, mobile)
├── services/             # Backend services (API modular monolith)
├── packages/             # Shared libraries (@cardwise/*)
├── infra/                # Docker, Terraform, Kubernetes
├── scripts/              # Setup, seed, codegen automation
├── docs/                 # Product and architecture documentation
├── plans/                # Master Development Plan (execution roadmap)
├── .github/              # CI/CD workflows (M-002+)
├── turbo.json            # Turborepo pipeline
├── lefthook.yml          # Git hooks (pre-commit quality gates)
├── .oxlintrc.json        # Oxlint configuration (root)
├── .oxfmtrc.json         # Oxfmt configuration (root)
└── package.json          # Bun workspaces + root scripts
```

## Technology Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vite 6 + React 19 + React Router v7 + Zustand + TanStack Query + shadcn/ui |
| Backend | NestJS 11 on Fastify + Prisma + PostgreSQL 16 + Redis + BullMQ |
| Analytics / Flags | PostHog Cloud |
| Cloud | AWS (ap-south-1) |
| Monorepo | **Bun workspaces + Turborepo** |
| Lint / Format | **Oxlint + Oxfmt** (Oxc toolchain) |
| Git Hooks | **Lefthook** |

> Toolchain change documented in `docs/adr/ADR-048-monorepo-toolchain-bun-oxc.md`.

## Prerequisites

- **Bun** 1.3+ ([install](https://bun.sh))
- **Docker** — [Colima](https://github.com/abiosoft/colima) + Docker CLI, or Docker Desktop
- **Node.js** 22+ (for NestJS/Vite runtime; see `.nvmrc`)

## Getting Started

### macOS without Docker Desktop (Colima)

```bash
brew install colima docker docker-compose
colima start --cpu 4 --memory 6
# Ensure compose plugin path (one-time):
# Add "/opt/homebrew/lib/docker/cli-plugins" to ~/.docker/config.json → cliPluginsExtraDirs
```

### First-time setup

```bash
# Full setup (install, .env.local, Docker infra, verify)
bun run setup

# Or manual steps:
bun install
cp .env.example .env.local   # edit if needed
bun run docker:up

# Quality checks
bun run verify:milestone
bun run verify:web          # Lighthouse + SEO (when working on apps/web)
```

### Consumer web design system (locked M-014b)

All `apps/web` UI follows **`docs/design/WEB_CONSUMER_DESIGN_SYSTEM.md`** — Bricolage Grotesque + DM Sans, light glass chrome, dark hero panels, `HeroLogo`, teal CTAs. Cursor rule: `.cursor/rules/web-consumer-design-system.mdc`.


### Local services (after `docker:up`)

| Service | URL / Port |
|---------|------------|
| PostgreSQL | `localhost:5433` — database `cardwise_dev` (Docker; avoids host Postgres on 5432) |
| Redis | `localhost:6379` |
| Mailpit UI | http://localhost:8025 |
| API | http://localhost:3000 — `bun run dev:api` |
| Swagger | http://localhost:3000/api/docs |
| Web | http://localhost:5173 — `bun run dev:web` |
| Admin | http://localhost:5174 — `bun run dev:admin` |

```bash
bun run db:migrate   # Phase 0 Prisma schema
bun run dev          # Infra + all apps/services (API, web, admin)
```

> Phase 0 foundation (G-0): monorepo, Docker, design system, analytics/flags, API + web shell, privacy stubs. See `plans/00_MASTER_DEVELOPMENT_PLAN.md`.

## Production deployment (MVP)

Canonical guide: **[`docs/14_DEPLOYMENT_STRATEGY.md`](docs/14_DEPLOYMENT_STRATEGY.md)**

| Layer | Target |
|-------|--------|
| Web / Admin | Vercel |
| API / Worker / Scheduler / Postgres / Redis | Hetzner VPS + Coolify + Docker |
| Assets | Cloudflare R2 |
| DNS / CDN | Cloudflare |
| Email | Resend |
| CI | GitHub Actions → GHCR → Coolify |

Env template: [`.env.production.example`](.env.production.example)  
Compose: [`infra/docker/docker-compose.production.yml`](infra/docker/docker-compose.production.yml)

## Development Governance

- **Roadmap:** `plans/00_MASTER_DEVELOPMENT_PLAN.md` (92 milestones, M-001–M-092)
- **Bootstrap:** `docs/23_CURSOR_PROJECT_BOOTSTRAP_PLAN.md` (stack and sprint definitions)
- **Toolchain ADR:** `docs/adr/ADR-048-monorepo-toolchain-bun-oxc.md`
- **Rules:** One milestone at a time; dependencies must be Verified before proceeding

### Git workflow

- **Pre-commit (Lefthook):** oxlint fix, oxfmt, typecheck on staged files
- **Commit-msg:** subject line ≤ 100 characters; include milestone ID (e.g. `M-001: description`)
- **Milestone gate:** engineering runs `bun run verify:milestone` before final review (includes web SEO baseline; Lighthouse when `apps/web` changed); you approve → commit → Verified → next milestone
- **Hooks install:** automatic on `bun install` when inside a git repository

## Package Naming

- npm scope: `@cardwise/*`
- Apps: `@cardwise/web`, `@cardwise/admin`, `@cardwise/extension`
- Service: `@cardwise/api`

## License

Proprietary — All rights reserved.
