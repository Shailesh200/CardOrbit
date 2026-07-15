# Local Docker Infrastructure

PostgreSQL 16, Redis 7, and Mailpit for local development (M-002).

## Quick start

```bash
# From repository root
bun run docker:up
bun run docker:ps
bun run docker:down
```

Or full first-time setup:

```bash
bash scripts/setup.sh
```

## Services

| Service | Host port | Purpose |
|---------|-----------|---------|
| PostgreSQL 16 | 5433 | Primary database (avoids host Postgres on 5432) |
| Redis 7 | 6379 | Cache and job queues |
| Mailpit SMTP | 1025 | Local email capture |
| Mailpit UI | 8025 | http://localhost:8025 |

## Health checks

All services define Docker healthchecks. Use `--wait` for blocking startup:

```bash
docker compose -f infra/docker/docker-compose.yml up -d --wait
```

## Configuration

Defaults match `.env.example`. Override via environment variables or `.env.local` at repo root when running Compose.
