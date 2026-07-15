# ADR-048 — Monorepo Toolchain: Bun, Oxlint, Oxfmt, and Lefthook

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-048 |
| **Status** | Accepted |
| **Date** | 2026-07-08 |
| **Supersedes** | Bootstrap plan pnpm + ESLint + Prettier toolchain (M-001 initial) |
| **Deciders** | Founder / Engineering |

## Context

During M-001 (Monorepo & Project Foundation), the initial toolchain used pnpm, ESLint 9, and Prettier. The team requested faster, more efficient developer tooling while preserving Turborepo for monorepo task orchestration and caching.

CardWise is a large long-lived monorepo (web, admin, API, extension, mobile, shared packages). CI and local feedback loops must remain fast as the codebase grows.

## Decision

Adopt the following **monorepo developer toolchain**:

| Concern | Tool | Rationale |
|---------|------|-----------|
| Package manager | **Bun** | Fast installs, native workspaces, compatible with npm ecosystem |
| Task orchestration | **Turborepo** | Unchanged — remote/local caching for build/test/typecheck |
| Linting | **Oxlint** (Oxc) | 50–100× faster than ESLint; ESLint-compatible rule migration path |
| Formatting | **Oxfmt** (Oxc) | Prettier-compatible output; pairs with Oxlint; single Oxc stack |
| Git hooks | **Lefthook** | Fast parallel pre-commit hooks; no Node husky overhead |
| Type checking | **TypeScript (`tsc`)** | Unchanged — Oxlint type-aware rules optional later |

### Removed

- pnpm (replaced by Bun workspaces)
- `@cardwise/eslint-config` / ESLint (replaced by `@cardwise/oxlint-config` / Oxlint)
- Prettier (replaced by Oxfmt)

### Not changed

- Application runtime targets (Node 22 for NestJS/Vite in production/dev)
- Turborepo pipeline structure
- `@cardwise/tsconfig` shared TypeScript configs

## Consequences

### Positive

- Faster `install`, lint, and format cycles locally and in CI
- Unified Oxc lint + format toolchain reduces config drift
- Lefthook enforces quality gates on every commit with minimal overhead
- Bun filter syntax replaces pnpm filter for workspace commands (`bun --filter @cardwise/api`)

### Negative / Trade-offs

- Bootstrap plan and CI docs reference pnpm until updated in M-002
- Oxlint does not support every ESLint plugin; use Oxlint JS plugins or incremental ESLint only if a required rule is missing
- Bun as package manager differs from some NestJS deployment docs (runtime remains Node)

### Deferred evaluation

| Tool | Purpose | When to add |
|------|---------|-------------|
| **Knip** | Dead code / unused export detection | M-003+ when application packages exist |
| **commitlint** | Conventional commit enforcement | Optional with Lefthook when team scales |
| **Biome** | All-in-one lint+format | Not adopted — overlaps with Oxlint+Oxfmt choice |

## Implementation

- Root: `.oxlintrc.json`, `.oxfmtrc.json`, `lefthook.yml`
- Shared config: `packages/oxlint-config/oxlint.json`
- Root scripts: `bun run check`, `bun run lint`, `bun run format`
- `prepare` script installs Lefthook hooks on `bun install`

## References

- [Turborepo — Oxc (oxlint and oxfmt)](https://turbo.build/repo/docs/guides/tools/oxc)
- [Oxlint documentation](https://oxc.rs/docs/guide/usage/linter)
- [Lefthook](https://github.com/evilmartians/lefthook)
- [Bun workspaces](https://bun.sh/docs/install/workspaces)
