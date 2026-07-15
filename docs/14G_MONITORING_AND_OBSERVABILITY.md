# 14G — Monitoring and Observability

---

## Health

| Check | How |
|-------|-----|
| API + DB | `GET https://api.example.com/health` |
| Coolify | Container running / restart counts |
| Vercel | Deployment status + uptime |

Uptime monitor (UptimeRobot, Better Stack, Cloudflare Health Checks) on `/health` every 1–5 minutes.

---

## Application errors

- Set `SENTRY_DSN` on API/worker.  
- Set `VITE_SENTRY_DSN` on Vercel web.  
- Alert on new issue spikes.

---

## Queues / worker

| Signal | Where |
|--------|-------|
| Job failures | `JobRun` rows + Sentry |
| Worker crash | Coolify restart loop |
| Redis memory | `INFO memory` / Coolify metrics |
| Stuck QUEUED jobs | Admin job UI / SQL |

Heartbeat: worker process must stay up; no HTTP heartbeat yet — treat container health as proxy.

---

## Host metrics (Hetzner / Coolify)

Watch: CPU, RAM, disk (≥20% free), Docker disk usage, Postgres size, Redis `used_memory`.

---

## Dependency failures

| System | Symptom | Action |
|--------|---------|--------|
| Gemini | AI endpoints 5xx / budget | Check key, quota, `AI_MONTHLY_BUDGET_USD` |
| SMTP / Resend | Auth emails missing | Check Resend dashboard + SMTP env |
| Google OAuth | Login redirect errors | Callback URL + client secrets |
| R2 | Asset 403/404 | Keys, bucket CORS, `ASSET_PUBLIC_BASE_URL` |

---

## Logs

- Coolify container logs for `api` / `worker` / `scheduler`.  
- Prefer structured Pino JSON (`LOG_LEVEL=info`).  
- Do not log secrets or raw Gmail tokens.

---

## Analytics

PostHog via `POSTHOG_API_KEY` — product funnels, not infra alerting.
