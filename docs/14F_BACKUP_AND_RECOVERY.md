# 14F — Backup and Recovery

---

## PostgreSQL

**Strategy:** Nightly logical dump → Cloudflare R2, ~30-day retention.

### Enable backup sidecar

Production compose profile `backup` runs [`infra/docker/scripts/pg-backup.sh`](../infra/docker/scripts/pg-backup.sh):

```bash
docker compose -f infra/docker/docker-compose.production.yml \
  --env-file .env.production --profile backup up -d db-backup
```

Requires R2 S3 credentials + `S3_ENDPOINT` + `BACKUP_S3_BUCKET` (or `S3_BUCKET`).

### Manual dump

```bash
docker compose -f infra/docker/docker-compose.production.yml \
  --env-file .env.production exec -T postgres \
  pg_dump -U cardorbit cardorbit | gzip > "cardorbit-$(date -u +%Y%m%d).sql.gz"
```

Upload to R2 with AWS CLI (`--endpoint-url` = R2).

### Restore

1. Put API/worker/scheduler in maintenance (scale to 0 or stop).  
2. Restore into a clean database (or drop/recreate schema carefully).  

```bash
gunzip -c backup.sql.gz | docker compose … exec -T postgres \
  psql -U cardorbit -d cardorbit
```

3. Run `prisma migrate deploy` if needed.  
4. Start services; smoke test.  

Practice restore on a staging volume at least quarterly.

---

## Object storage (R2)

Uploads/assets live in R2 — use R2 versioning or object lifecycle rules. No VPS disk backups for uploads.

---

## Redis

No backups in Phase 1. Queue state is ephemeral; jobs can be re-enqueued. Cache loss is acceptable.

If you later store critical data in Redis, enable AOF + managed snapshots ([14H](14H_SCALING_STRATEGY.md)).

---

## Coolify / host

- Snapshot the Hetzner volume weekly if available.  
- Snapshots complement, not replace, `pg_dump` to R2.
