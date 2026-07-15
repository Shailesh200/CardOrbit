# 14J — Operational Runbook

Day-2 operations for CardOrbit MVP production.

---

## Production release checklist

1. **Database** — Postgres healthy; volume mounted.  
2. **Migrations** — `compose --profile migrate run --rm migrate` succeeds.  
3. **API** — image deployed; `GET /health` → `ok`.  
4. **Worker** — container up; no crash loop.  
5. **Scheduler** — container up; crontab loaded.  
6. **Frontend** — Vercel web + admin production deployments.  
7. **Smoke tests** (below).  
8. **Verification** — Sentry quiet; one real login; optional Gmail sync job.

---

## Smoke tests

```bash
curl -fsS https://api.example.com/health
# Expect JSON status ok

curl -fsSI https://app.example.com
curl -fsSI https://admin.example.com
```

Manual:

- [ ] Consumer signup / login  
- [ ] Google OAuth (if enabled)  
- [ ] Admin login  
- [ ] Enqueue a harmless job or trigger Gmail sync on a test account  
- [ ] Transactional email received (Resend)  

---

## Deploy / update services

Normal: merge to `main` → Actions → Coolify.

Pin rollback tag:

```bash
# Coolify env
IMAGE_TAG=<previous_git_sha>
# Redeploy
```

---

## Rollback

1. Set `IMAGE_TAG` to last known good SHA; redeploy API/worker/scheduler.  
2. If migration broke data, restore DB dump from R2 first ([14F](14F_BACKUP_AND_RECOVERY.md)).  
3. Revert Vercel deployment from Vercel dashboard if frontend regresses.

---

## Common incidents

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `/health` 503 | Postgres down | Check postgres container / disk |
| Jobs stuck | Worker down / Redis | Restart worker; check Redis |
| OAuth fails | Callback URL mismatch | Fix Google console + `GOOGLE_CALLBACK_URL` |
| No emails | SMTP/Resend | Verify `SMTP_*` / Resend dashboard |
| 502 from Cloudflare | Coolify/API down | Coolify logs; free disk |

---

## Scaling / maintenance windows

- Announce short window for Postgres upgrades.  
- Vertical resize: shut down cleanly, resize Hetzner, boot, start Coolify.  

---

## Contacts / owners

| Area | Owner |
|------|--------|
| VPS / Coolify | Solo deploy owner |
| DNS / R2 / Cloudflare | Solo deploy owner |
| Vercel | Solo deploy owner |
| Sentry / PostHog | Solo deploy owner |

Update this table when the team grows.
