# CardWise API (`@cardwise/api`)

NestJS 11 modular monolith on Fastify.

## Milestones

| Milestone | What |
|-----------|------|
| M-005 | Health, Swagger, privacy stubs, Phase 0 schema |
| M-006 | Credit card master (`cards` schema) |
| M-007 | Merchant master (`merchants` schema) |
| M-008 | Reward rules (`rewards` schema) |
| M-009 | Offers (`offers` schema) |
| M-011 | Admin CMS auth + guarded CRUD APIs |
| M-017 | Reward Engine V1 — deterministic calculation |
| M-018 | Recommendation Engine V1 — explainable ranking |

## Commands

```bash
bun run db:generate
bun run db:migrate
bun run dev
```

## Admin endpoints (Bearer admin JWT)

Login: `POST /api/v1/admin/auth/login` with `{ email, password }` (bootstrap from `ADMIN_BOOTSTRAP_*`).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | DB ping + status |
| GET | `/api/docs` | Swagger UI |
| POST | `/api/v1/admin/auth/login` | Issue admin JWT (`typ: admin`) |
| GET | `/api/v1/admin/auth/me` | Current admin (guarded) |
| GET/POST | `/api/v1/admin/credit-cards` | List / create |
| PATCH | `/api/v1/admin/credit-cards/:id` | Update |
| POST | `/api/v1/admin/credit-cards/:id/archive` | Soft-archive |
| GET | `/api/v1/admin/banks` | Banks |
| GET | `/api/v1/cards/catalog` | Browse credit card catalog (consumer JWT) |
| GET | `/api/v1/merchants/search` | Search merchants (`q`, `categorySlug`, pagination) |
| GET | `/api/v1/merchants/popular` | Popular merchants |
| GET | `/api/v1/merchants/categories` | Merchant categories |
| GET | `/api/v1/merchants/:slug` | Merchant detail |
| GET/POST | `/api/v1/admin/merchants` | List / create |
| PATCH | `/api/v1/admin/merchants/:id` | Update |
| POST | `/api/v1/admin/merchants/:id/aliases` | Add alias |
| DELETE | `/api/v1/admin/merchants/aliases/:aliasId` | Soft-delete alias |
| POST | `/api/v1/admin/mcc-mappings` | MCC mapping |
| GET/POST | `/api/v1/admin/reward-rules` | List / create |
| POST | `/api/v1/admin/reward-rules/:ruleId/versions` | New version |
| POST | `/api/v1/admin/reward-rules/preview` | Preview rule payload calculation |
| POST | `/api/v1/admin/reward-rules/versions/:id/activate` | Activate |
| POST | `/api/v1/admin/reward-rules/versions/:id/deactivate` | Deactivate |
| POST | `/api/v1/rewards/calculate` | Calculate reward for card + amount (consumer JWT) |
| POST | `/api/v1/admin/assets/upload` | Upload image file (multipart) → public URL |
| GET | `/api/v1/admin/assets?tab=banks&page=1&limit=10&q=` | Paginated catalog + asset URLs |
| POST | `/api/v1/admin/assets/banks` | Create bank |
| PATCH | `/api/v1/admin/assets/banks/:id` | Update bank (name, slug, country, logoUrl) |
| POST | `/api/v1/admin/assets/banks/:id/archive` | Archive bank |
| POST | `/api/v1/admin/assets/merchants` | Create merchant |
| PATCH | `/api/v1/admin/assets/merchants/:id` | Update merchant |
| POST | `/api/v1/admin/assets/merchants/:id/archive` | Archive merchant |
| POST | `/api/v1/admin/assets/credit-cards` | Create credit card |
| PATCH | `/api/v1/admin/assets/credit-cards/:id` | Update credit card |
| POST | `/api/v1/admin/assets/credit-cards/:id/archive` | Archive credit card |
| GET | `/api/v1/assets/brands` | Public slug → logo/image URL registry |
| GET | `/api/v1/recommendations/showcase` | Public live recommendation for home hero (no auth) |
| POST | `/api/v1/recommendations/best-card` | Best card for transaction (consumer JWT) |
| POST | `/api/v1/admin/recommendations/audit` | Audit recommendation evaluation for a user |
| GET/POST | `/api/v1/admin/offers` | List / create |
| PATCH | `/api/v1/admin/offers/:id` | Update |
| POST | `/api/v1/admin/offers/:id/cards` | Assign card |
| POST | `/api/v1/admin/offers/:id/merchants` | Assign merchant |

Default port: **3000** (`PORT` env). Postgres default: **5433**. Admin UI: **5174**.
