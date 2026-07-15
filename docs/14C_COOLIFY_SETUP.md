# 14C — Coolify Setup (Hetzner)

End-to-end MVP host setup. Pair with [14I Security](14I_SECURITY_HARDENING.md).

---

## 1. Provision VPS

1. Create Hetzner Cloud server: Ubuntu 24.04, ≥ 4 GB RAM.  
2. Attach IPv4; note public IP.  
3. Create SSH key; disable password auth later.  
4. Point Cloudflare A/AAAA records for `api.example.com` at the VPS (proxied or DNS-only during Coolify SSL setup — follow Coolify docs for Cloudflare proxy).

---

## 2. Base Ubuntu

```bash
ssh root@YOUR_IP
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban unattended-upgrades
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

Create a sudo deploy user (optional) and lock down root SSH — see [14I](14I_SECURITY_HARDENING.md).

---

## 3. Install Docker

Coolify can install Docker for you. Manual option:

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

---

## 4. Install Coolify

Follow official Coolify docs (self-hosted):

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Open `http://YOUR_IP:8000` (or the URL Coolify prints), create admin account, enable HTTPS for the Coolify dashboard behind Cloudflare if desired.

---

## 5. Connect GitHub

1. Coolify → Sources → GitHub App / PAT.  
2. Select the CardOrbit repository.  
3. Create a **Docker Compose** resource:
   - Base directory: `/`
   - Compose file: `infra/docker/docker-compose.production.yml`
   - Branch: `main`
4. Import env from [`.env.production.example`](../.env.production.example) (fill real secrets in Coolify UI — never commit).  
5. Set `IMAGE_REGISTRY` / `IMAGE_TAG` so compose pulls GHCR images built by Actions.  
6. Domain: `api.example.com` → service `api` port `3000`.  
7. Enable automatic deploy on push **or** use webhook URL as GitHub secret `COOLIFY_WEBHOOK_URL`.

See [`infra/coolify/coolify.yml`](../infra/coolify/coolify.yml) for a short checklist.

---

## 6. First deploy order

1. Ensure `postgres` + `redis` healthy.  
2. Run migrate profile once.  
3. Confirm `api` `/health` returns 200.  
4. Confirm `worker` + `scheduler` running.  
5. Deploy Vercel frontends with `VITE_API_URL=https://api.example.com`.  
6. Smoke tests — [14J](14J_OPERATIONAL_RUNBOOK.md).

---

## 7. Rolling updates

Preferred path: GitHub Actions builds new images → Coolify redeploys compose with new `IMAGE_TAG` → migrate → containers recreate.

Avoid hand-editing containers on the VPS except for emergencies.

---

## 8. Rollback

1. Redeploy previous image tag (git sha) via Coolify / compose `IMAGE_TAG`.  
2. If a migration is irreversible, restore DB from R2 backup ([14F](14F_BACKUP_AND_RECOVERY.md)) before rolling app images.  
3. Prefer forward-fix migrations in Prisma to keep rollbacks app-only.
