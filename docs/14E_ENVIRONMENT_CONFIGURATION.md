# 14E — Environment Configuration

Template: [`.env.production.example`](../.env.production.example)  
Local dev remains [`.env.example`](../.env.example) → `.env.local`.

Store production values in **Coolify env UI** and **Vercel project env**. Never commit secrets.

---

## Naming note

Code uses these names (not shortened aliases):

| You may see elsewhere | Actual env var |
|-----------------------|----------------|
| `JWT_SECRET` | `JWT_ACCESS_SECRET` |
| `GOOGLE_REDIRECT_URI` | `GOOGLE_CALLBACK_URL` |
| `ADMIN_URL` | `ADMIN_APP_URL` |
| `POSTHOG_KEY` | `POSTHOG_API_KEY` |
| `SMTP_PASSWORD` | `SMTP_PASS` |

---

## Backend / Coolify (API, worker, scheduler, migrate)

### Required

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Postgres URL (`postgres` hostname inside compose) |
| `REDIS_URL` | e.g. `redis://redis:6379` |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Separate secret |
| `TOKEN_ENCRYPTION_KEY` | 32-byte base64 — Gmail token encryption |
| `ADMIN_JWT_SECRET` | Admin CMS JWT |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth |
| `GOOGLE_CALLBACK_URL` | `https://api…/api/v1/auth/oauth/callback` |
| `APP_URL` | Consumer origin (CORS) |
| `ADMIN_APP_URL` | Admin origin (CORS) |
| `API_URL` | Public API URL |
| `ASSET_PUBLIC_BASE_URL` | Public asset base (R2 domain) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Resend SMTP |
| `EMAIL_FROM` | From header |
| `GEMINI_API_KEY` | AI |
| `POSTGRES_PASSWORD` | DB bootstrap |

### Strongly recommended

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Documented for ops; SMTP uses `SMTP_PASS` today |
| `SENTRY_DSN` | API/worker errors |
| `POSTHOG_API_KEY` | Product analytics / flags |
| `S3_BUCKET` / `S3_ENDPOINT` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | R2 |
| `LOG_LEVEL` | `info` |
| `IMAGE_REGISTRY` / `IMAGE_TAG` | Compose image pull |

### Optional

`OTEL_EXPORTER_OTLP_ENDPOINT`, `AI_MONTHLY_BUDGET_USD`, model overrides, `BACKUP_S3_BUCKET`.

---

## Vercel (web + admin)

| Variable | Where |
|----------|--------|
| `VITE_API_URL` | Both projects — prod API URL |
| `VITE_SENTRY_DSN` | Consumer web |
| `VITE_WEB_URL` | Extension builds if applicable |

Rebuild required after changing `VITE_*`.

---

## Google Cloud Console

Authorized redirect URI must match `GOOGLE_CALLBACK_URL` exactly.  
Authorized JavaScript origins: `APP_URL`, `ADMIN_APP_URL`.

---

## Secret generation

```bash
openssl rand -base64 32   # JWT_ACCESS_SECRET
openssl rand -base64 32   # JWT_REFRESH_SECRET
openssl rand -base64 32   # ADMIN_JWT_SECRET
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
openssl rand -base64 24   # POSTGRES_PASSWORD
```

Rotate JWT secrets only with a planned logout of all sessions ([14I](14I_SECURITY_HARDENING.md)).
