# 14B — Docker Deployment

Production images and Compose live under [`infra/docker/`](../infra/docker/).

---

## Images

| Dockerfile | Image suffix | Role |
|------------|--------------|------|
| `Dockerfile.api` | `-api` | NestJS API |
| `Dockerfile.worker` | `-worker` | BullMQ worker |
| `Dockerfile.scheduler` | `-scheduler` | supercronic + API CLIs |
| `Dockerfile.web` | `-web` | Optional nginx SPA (preview; prod = Vercel) |
| `Dockerfile.admin` | `-admin` | Optional nginx SPA (preview; prod = Vercel) |

Build from **monorepo root** (Bun workspaces):

```bash
docker build -f infra/docker/Dockerfile.api -t cardorbit-api:local .
docker build -f infra/docker/Dockerfile.worker -t cardorbit-worker:local .
docker build -f infra/docker/Dockerfile.scheduler -t cardorbit-scheduler:local .
```

CI pushes to GHCR as:

- `ghcr.io/<owner>/<repo>-api:<sha>`
- `ghcr.io/<owner>/<repo>-worker:<sha>`
- `ghcr.io/<owner>/<repo>-scheduler:<sha>`

Set compose `IMAGE_REGISTRY=ghcr.io/<owner>/<repo>` and `IMAGE_TAG=<sha|latest>`.

---

## Compose file

[`infra/docker/docker-compose.production.yml`](../infra/docker/docker-compose.production.yml)

Services: `postgres`, `redis`, `api`, `worker`, `scheduler`, optional profiles:

- `migrate` — one-shot Prisma migrate  
- `backup` — nightly dump helper  

```bash
# Pull/run (example)
export IMAGE_TAG=abc1234
docker compose -f infra/docker/docker-compose.production.yml \
  --env-file .env.production up -d

# Migrations
docker compose -f infra/docker/docker-compose.production.yml \
  --env-file .env.production --profile migrate run --rm migrate
```

---

## Health

API exposes `GET /health` (DB check). Compose and Coolify should use this for readiness.

Worker/scheduler have no HTTP port — monitor via Coolify container status + Sentry + job tables.

---

## Scheduler crontab

[`infra/docker/crontab`](../infra/docker/crontab) (UTC):

- Daily 01:15 — `reward-expiry:scan`  
- Hourly :10 — `notifications:sync`  

Adjust schedules in that file; rebuild scheduler image to apply.

---

## Local preview frontends (optional)

```bash
docker build -f infra/docker/Dockerfile.web \
  --build-arg VITE_API_URL=https://api.example.com \
  -t cardorbit-web:local .
```

Production web/admin **must** deploy via Vercel with the same `VITE_API_URL`.

---

## Notes

- `.dockerignore` excludes `node_modules`, docs, uploads, env files.  
- Do not bind-mount `uploads/` in production — use R2.  
- Prisma generate runs at image build from `services/api/prisma`.
