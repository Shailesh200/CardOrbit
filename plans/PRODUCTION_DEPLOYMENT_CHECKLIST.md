# CardOrbit Production Deployment Checklist

Domain: **cardorbit.in** (confirmed)  
Stack: Vercel · Hetzner + Coolify · Cloudflare · R2 · Resend · Sentry · PostHog · Gemini · GitHub Actions  

Tick items top-to-bottom. Save secrets only in Coolify / Vercel / GitHub — never in git.

---

## Step 1 — Domain

**Status: DONE** — `cardorbit.in`

**Save (if not already)**
- Registrar account email
- Domain expiry date

---

## Step 2 — Cloudflare account + add site

**Where:** https://dash.cloudflare.com/sign-up → https://dash.cloudflare.com

**Tasks**
- [ ] Create Cloudflare account (or sign in)
- [ ] Add site → `cardorbit.in`
- [ ] Choose Free plan
- [ ] Copy the two Cloudflare nameservers shown

**Save**
- Cloudflare account email
- Nameservers (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`)

**Verify**
- Site listed in Cloudflare dashboard (DNS may be Pending Nameserver Update)

---

## Step 3 — Point nameservers at Cloudflare

**Where:** Registrar DNS / nameserver settings

**Tasks**
- [ ] Replace registrar nameservers with Cloudflare’s two NS records
- [ ] Save

**Verify**
- Cloudflare Overview shows **Active** (can take minutes–48h)
- CLI: `dig NS cardorbit.in +short`

---

## Step 4 — GitHub repo ready

**Where:** https://github.com (your CardOrbit remote)

**Tasks**
- [ ] Confirm `main` is the production branch
- [ ] Confirm deploy workflow exists: `.github/workflows/deploy.yml`
- [ ] Enable GitHub Packages (GHCR) for the repo if private

**Save**
- Repo URL: `https://github.com/ORG/REPO`
- Exact `ORG/REPO` for image names

**Verify**
- You can push to `main`

---

## Step 5 — SSH key for VPS

**Status: DONE**

**Save**
- Private key path: `~/.ssh/cardorbit_hetzner` (never commit)
- Public key: `~/.ssh/cardorbit_hetzner.pub`

---

## Step 6 — Hetzner account + VPS

**Status: DONE** — CPX22 / Ubuntu / Falkenstein · IP `167.233.223.123`

**Save**
- Hetzner project: `cardorbit-prod`
- Server: `cardorbit-api`
- **VPS_IP=167.233.223.123**

**Verify**
```bash
ssh -i ~/.ssh/cardorbit_hetzner root@167.233.223.123 'uname -a'
```

---

## Step 7 — Ubuntu baseline

**Status: DONE** — ufw (22/80/443), fail2ban, unattended-upgrades

---

## Step 8 — Docker

**Status: DONE** — Docker installed; `hello-world` OK

---

## Step 9 — Coolify

**Status: DONE** — Coolify **4.1.2**; admin account created

**URL:** http://167.233.223.123:8000

---

## Step 10 — Cloudflare DNS records (initial)

**Status: DONE** — `api.cardorbit.in` → `167.233.223.123` (DNS only)

---

## Step 18 — Coolify: connect GitHub + compose app (in progress)

**GitHub App: DONE** — `card-orbit-coolify`  
**Repo: DONE** — `Shailesh200/CardOrbit` on `main`  
**Compose resource: DONE** — `infra/docker/docker-compose.production.yml`

**Next:** paste Coolify env (secrets kept in password manager only — not in git)

---

## Step 11 — Cloudflare R2

**Where:** Cloudflare → R2 → https://dash.cloudflare.com → R2

**Tasks**
- [ ] Enable R2
- [ ] Create bucket: `cardorbit-assets`
- [ ] Create bucket: `cardorbit-backups` (private)
- [ ] R2 → Manage R2 API Tokens → Create token (Object Read & Write on those buckets)
- [ ] Note **Account ID** (R2 overview sidebar)
- [ ] Optional: Custom domain `assets.cardorbit.in` on `cardorbit-assets`

**Save → later env**
```bash
S3_BUCKET=cardorbit-assets
BACKUP_S3_BUCKET=cardorbit-backups
S3_REGION=auto
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
ASSET_PUBLIC_BASE_URL=https://assets.cardorbit.in
```

**Verify**
- Token works with a test upload (AWS CLI or dashboard)

---

## Step 12 — Resend

**Where:** https://resend.com/signup → https://resend.com/domains

**Tasks**
- [ ] Create account
- [ ] Add domain `cardorbit.in`
- [ ] Add Resend DNS records in Cloudflare (SPF/DKIM/etc.)
- [ ] Verify domain
- [ ] Create API key

**Save → env**
```bash
RESEND_API_KEY=re_...
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_...          # same API key
EMAIL_FROM=CardOrbit <noreply@cardorbit.in>
```

**Verify**
- Domain status Verified; send test email from Resend UI

---

## Step 13 — Google Cloud (OAuth + Gmail + Gemini)

**Where:** https://console.cloud.google.com

**Tasks**
- [ ] Create project e.g. `cardorbit-prod`
- [ ] APIs & Services → Enable **Google+ / Google Identity** as needed, **Gmail API**
- [ ] OAuth consent screen → External (or Internal) → App name CardOrbit → support email
- [ ] Scopes: email, profile, `gmail.readonly` (as required by app)
- [ ] Credentials → Create **OAuth client ID** → Web application
  - Authorized JS origins: `https://app.cardorbit.in`, `https://admin.cardorbit.in`
  - Redirect URI: `https://api.cardorbit.in/api/v1/auth/oauth/callback`
- [ ] https://aistudio.google.com/apikey → Create **Gemini API key** (or GCP Gemini key)

**Save → env**
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.cardorbit.in/api/v1/auth/oauth/callback
GEMINI_API_KEY=...
AI_PROVIDER=gemini
```

**Verify**
- OAuth client created; Gemini key returns a simple API call success

---

## Step 14 — Sentry

**Where:** https://sentry.io (org e.g. `shailesh-jha`)

**Tasks**
- [x] Create projects: `cardorbit-web` (React), `cardorbit-admin` (React), `cardorbit-api` (Node/Nest), `cardorbit-worker` (Node)
- [x] Copy DSNs
- [x] Vercel web + admin: `VITE_SENTRY_DSN` (Production + Preview) → redeploy
- [x] Coolify: `SENTRY_DSN` on shared env (api DSN; worker shares until per-service split) → redeploy
- [ ] Confirm test events in each project (web/admin ErrorBoundary or debug; API non-prod `/api/v1/debug/sentry-test`; worker failed job)

**Save → env**
```bash
# Coolify (api / worker / scheduler)
SENTRY_DSN=https://...@o....ingest.sentry.io/...   # cardorbit-api (or worker-specific)

# Vercel web
VITE_SENTRY_DSN=https://...@o....ingest.sentry.io/...   # cardorbit-web

# Vercel admin
VITE_SENTRY_DSN=https://...@o....ingest.sentry.io/...   # cardorbit-admin
```

**Verify**
- Project accepts a test event with correct `environment` / `release` / tags (`surface` or `service`)
- PII scrub: no Authorization headers or emails in event payloads

---

## Step 15 — PostHog

**Where:** https://app.posthog.com/signup

**Tasks**
- [ ] Create project
- [ ] Copy Project API Key

**Save → env**
```bash
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://app.posthog.com
```

**Verify**
- Key shown on project settings

---

## Step 16 — Generate app secrets (laptop)

```bash
openssl rand -base64 32   # JWT_ACCESS_SECRET
openssl rand -base64 32   # JWT_REFRESH_SECRET
openssl rand -base64 32   # ADMIN_JWT_SECRET
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
openssl rand -base64 24   # POSTGRES_PASSWORD
```

**Save** all five into your password manager

---

## Step 17 — Compose full production env list

**Where:** Password manager / notes → will paste into Coolify + Vercel + GitHub

**Required Coolify / VPS values** (see `.env.production.example`)

```bash
NODE_ENV=production
LOG_LEVEL=info
APP_URL=https://app.cardorbit.in
ADMIN_APP_URL=https://admin.cardorbit.in
API_URL=https://api.cardorbit.in
ASSET_PUBLIC_BASE_URL=https://assets.cardorbit.in

POSTGRES_USER=cardorbit
POSTGRES_PASSWORD=...
POSTGRES_DB=cardorbit
DATABASE_URL=postgresql://cardorbit:PASSWORD@postgres:5432/cardorbit
REDIS_URL=redis://redis:6379

JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
TOKEN_ENCRYPTION_KEY=...
ADMIN_JWT_SECRET=...
ADMIN_BOOTSTRAP_EMAIL=admin@cardorbit.in
ADMIN_BOOTSTRAP_PASSWORD=...   # strong; change after first login

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.cardorbit.in/api/v1/auth/oauth/callback

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=...
EMAIL_FROM=CardOrbit <noreply@cardorbit.in>
RESEND_API_KEY=...

GEMINI_API_KEY=...
AI_PROVIDER=gemini

SENTRY_DSN=...
POSTHOG_API_KEY=...
POSTHOG_HOST=https://app.posthog.com

S3_BUCKET=cardorbit-assets
BACKUP_S3_BUCKET=cardorbit-backups
S3_REGION=auto
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

IMAGE_REGISTRY=ghcr.io/ORG/REPO
IMAGE_TAG=latest
```

**Vercel (web + admin)**
```bash
VITE_API_URL=https://api.cardorbit.in
VITE_SENTRY_DSN=...
```

**Verify**
- Every required key filled (no empty secrets)

---

## Step 18 — Coolify: connect GitHub + compose app

**Where:** Coolify dashboard

**Tasks**
- [ ] Sources → connect GitHub (GitHub App)
- [ ] New Resource → Docker Compose
- [ ] Repo: CardOrbit · Branch: `main`
- [ ] Compose file: `infra/docker/docker-compose.production.yml`
- [ ] Base directory: `/`
- [ ] Paste all Coolify env vars from Step 17
- [ ] Domain for service `api`: `api.cardorbit.in` port `3000`
- [ ] Enable HTTPS
- [ ] Copy **Deploy Webhook** URL

**Save**
- `COOLIFY_WEBHOOK_URL=...`

**Verify**
- Coolify shows compose services defined (may not be healthy until images exist)

---

## Step 19 — GitHub Actions secrets + GHCR

**Where:** GitHub → Repo → Settings → Secrets and variables → Actions  
https://github.com/ORG/REPO/settings/secrets/actions

**Create secrets**
- [ ] `COOLIFY_WEBHOOK_URL`
- [ ] `COOLIFY_TOKEN` (if Coolify requires it)
- Optional SSH migrate:
- [ ] `DEPLOY_HOST` = VPS_IP or hostname
- [ ] `DEPLOY_USER` = root or deploy user
- [ ] `DEPLOY_SSH_KEY` = private key PEM contents
- [ ] `DEPLOY_PATH` = path to repo on server (if used)

**Tasks**
- [ ] Settings → Actions → General → allow workflow read/write for GHCR if needed
- [ ] After first successful image push: Coolify must be able to pull `ghcr.io/ORG/REPO-api` (public package or registry login)

**Verify**
- Secrets listed; no values in git

---

## Step 20 — Vercel projects

**Where:** https://vercel.com/new

**Domain model**
- `cardorbit.in` (+ `www`) → marketing landing
- `app.cardorbit.in` → login / signup / account (after auth)
- `admin.cardorbit.in` → admin CMS

**Tasks**
- [ ] Import GitHub repo twice (or two projects):
  - **cardorbit-web** — Root Directory `apps/web`
  - **cardorbit-admin** — Root Directory `apps/admin`
- [ ] Framework: Vite
- [ ] Env (web): `VITE_API_URL=https://api.cardorbit.in`, `VITE_LANDING_ORIGIN=https://cardorbit.in`, `VITE_APP_ORIGIN=https://app.cardorbit.in` (+ optional `VITE_SENTRY_DSN`)
- [ ] Env (admin): `VITE_API_URL=https://api.cardorbit.in`
- [ ] Production branch: `main`
- [ ] Domains on **cardorbit-web**: `cardorbit.in`, `www.cardorbit.in`, `app.cardorbit.in`
- [ ] Domain on **cardorbit-admin**: `admin.cardorbit.in`
- [ ] In Cloudflare DNS: apex/`www`/`app`/`admin` → Vercel targets Vercel shows
- [ ] Coolify `APP_URL=https://app.cardorbit.in` (OAuth + email links)

**Save**
- Vercel project URLs
- Deployment URLs

**Verify**
- Preview deploy builds (API may 502 until backend is up — build itself should succeed)

---

## Step 21 — First image build (CI)

**Where:** GitHub → Actions

**Tasks**
- [ ] Push to `main` or run **Deploy production** workflow_dispatch
- [ ] Wait for `build-images` to push `-api`, `-worker`, `-scheduler`

**Verify**
- https://github.com/ORG/REPO/pkgs/container/ — images exist
- Coolify can pull them (`IMAGE_REGISTRY` / `IMAGE_TAG` correct)

---

## Step 22 — First Coolify deploy + migrate

**Where:** Coolify

**Tasks**
- [ ] Deploy stack (postgres, redis, api, worker, scheduler)
- [ ] Run migrate once:
```bash
# On VPS, from compose directory / Coolify command
docker compose -f infra/docker/docker-compose.production.yml \
  --env-file .env.production --profile migrate run --rm migrate
```
- [ ] Restart api / worker / scheduler if needed

**Verify**
```bash
curl -fsS https://api.cardorbit.in/health
```
- Expect `status: ok`
- Worker + scheduler containers **running**

---

## Step 23 — SSL + DNS final

**Where:** Cloudflare + Coolify + Vercel

**Tasks**
- [ ] `api` HTTPS green in browser
- [ ] `app` / `admin` HTTPS via Vercel
- [ ] `assets` HTTPS via R2 custom domain
- [ ] Cloudflare SSL/TLS mode: **Full (strict)** once origins have valid certs

**Verify**
```bash
curl -fsSI https://api.cardorbit.in/health
curl -fsSI https://app.cardorbit.in
curl -fsSI https://admin.cardorbit.in
```

---

## Step 24 — Backups

**Where:** Coolify / VPS

**Tasks**
- [ ] Enable compose profile `backup` **or** cron `pg_dump` → R2 using Step 11 creds
- [ ] Run one manual dump and confirm object in `cardorbit-backups`

**Verify**
- Backup object visible in R2; download + `gunzip -t` ok

---

## Step 25 — Monitoring

**Tasks**
- [ ] Sentry: trigger a test error from API or wait for real event
- [ ] PostHog: load `app.cardorbit.in` logged-out and confirm event
- [ ] Optional: UptimeRobot / Better Stack HTTP check on `https://api.cardorbit.in/health`

**Verify**
- Alerts/notifications email configured

---

## Step 26 — Production smoke test

**Tasks**
- [ ] Open `https://app.cardorbit.in` — branding loads
- [ ] Sign up / login
- [ ] Google OAuth (if enabled)
- [ ] Admin login at `https://admin.cardorbit.in`
- [ ] Trigger Gmail sync on a test user (worker must process job)
- [ ] Confirm email from Resend (OTP/login)
- [ ] Confirm no critical Sentry issues

**Verify**
- Checklist complete → treat production as live

---

## Credential map (quick reference)

| Secret | Created at | Used in |
|--------|------------|---------|
| Domain NS | Registrar / Cloudflare | DNS |
| VPS IP + SSH key | Hetzner / laptop | SSH, optional GitHub `DEPLOY_*` |
| Coolify webhook | Coolify | GitHub `COOLIFY_WEBHOOK_URL` |
| R2 keys + endpoint | Cloudflare R2 | Coolify `S3_*` / `AWS_*` |
| Resend API key | Resend | Coolify `SMTP_PASS` / `RESEND_API_KEY` |
| Google OAuth client | Google Cloud | Coolify `GOOGLE_*` |
| Gemini key | AI Studio / GCP | Coolify `GEMINI_API_KEY` |
| Sentry DSN | Sentry | Coolify + Vercel |
| PostHog key | PostHog | Coolify (+ optional Vercel) |
| JWT / DB passwords | `openssl` | Coolify |
| `VITE_API_URL` | you | Vercel |

---

## Stop / ask for help if

- Coolify cannot pull GHCR (auth/package visibility)
- `/health` never becomes ok (Postgres URL / migrate)
- OAuth redirect mismatch
- Cloudflare **Full strict** SSL errors (use Full or DNS-only briefly)
