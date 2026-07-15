# 14H — Scaling Strategy

Preserve architecture; move stateful pieces off the VPS when needed.

---

## Phase 1 — Single VPS (MVP)

One Hetzner VM + Coolify:

- API, worker, scheduler, Postgres, Redis  

Scale vertically (bigger VPS) first.

---

## Phase 2 — Managed PostgreSQL

1. Provision managed Postgres 16 with **pgvector**.  
2. `pg_dump` / restore or logical replication cutover.  
3. Point `DATABASE_URL` at managed instance.  
4. Remove `postgres` service from compose.  
5. Keep Redis + apps on VPS.

---

## Phase 3 — Managed Redis + second API

1. Managed Redis; update `REDIS_URL`.  
2. Remove local `redis` service.  
3. Run a second API replica (Coolify scale / second container) behind Coolify/Cloudflare load balancing.  
4. Worker remains single instance until Phase 4.

---

## Phase 4 — Dedicated workers / horizontal API

- Dedicated worker machines or multiple worker replicas (BullMQ concurrency aware).  
- Dedicated scheduler (still one).  
- Multiple API instances + load balancer.  
- Optional: split read replicas for heavy analytics.

---

## Explicit non-goals (until Phase 4+)

- Kubernetes  
- Rewriting API as serverless  
- Multi-region active-active  

Enterprise multi-region remains described in `14_SCALABILITY_AND_DEVOPS.md` for later.
