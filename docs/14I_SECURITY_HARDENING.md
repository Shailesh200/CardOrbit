# 14I — Security Hardening

---

## Transport

- HTTPS everywhere (Cloudflare + Coolify certificates).  
- HSTS via Cloudflare.  
- No plain HTTP APIs in production.

---

## Secrets

- Coolify / Vercel env stores only — never git.  
- `.env.production.example` is empty placeholders.  
- Rotate compromised keys immediately (JWT rotation logs out users).  
- Separate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`.

---

## SSH / host

```bash
# /etc/ssh/sshd_config (illustrative)
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

- `fail2ban` on sshd.  
- `ufw`: allow 22 (or custom), 80, 443 only.  
- `unattended-upgrades` for security patches.  
- Do not expose `5432` / `6379` publicly.

---

## Application

- CORS limited to `APP_URL` + `ADMIN_APP_URL`.  
- Disable or IP-restrict Swagger in production (follow-up if still enabled).  
- Secure cookies / SameSite as implemented by auth modules.  
- Production uploads via R2 — no world-writable upload dirs on VPS.

---

## Cloudflare

- Proxy `api` / web / admin as appropriate.  
- Enable bot fight / basic DDoS.  
- WAF custom rules later for `/api/v1/auth/*` abuse.

---

## Backup verification

- Quarterly restore drill ([14F](14F_BACKUP_AND_RECOVERY.md)).  
- Restrict R2 backup bucket (no public ACL).

---

## Access

- Prefer Coolify UI + GitHub Actions over standing SSH.  
- Emergency SSH only with personal keys; revoke on departure.
