# 14D — CI/CD Pipeline

Workflows:

| File | Purpose |
|------|---------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | PR/push quality (`verify:milestone`) |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | Production build → GHCR → Coolify |

---

## Production flow

```text
git push main
  → quality (lint / typecheck / milestone verify)
  → build-images (api, worker, scheduler) → ghcr.io
  → deploy job
       → Coolify webhook (optional)
       → SSH migrate + restart (optional secrets)
```

Frontends: Vercel Git integration on `main` (separate from this workflow).

---

## Required GitHub configuration

### Packages

`deploy.yml` uses `permissions: packages: write` and `GITHUB_TOKEN` to push to GHCR.

Ensure packages are visible to the VPS (public package or Coolify/GitHub auth for private pulls).

### Secrets / variables

| Secret | Purpose |
|--------|---------|
| `COOLIFY_WEBHOOK_URL` | Trigger Coolify redeploy |
| `COOLIFY_TOKEN` | Optional bearer for webhook |
| `DEPLOY_HOST` | VPS hostname (optional SSH migrate) |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key |
| `DEPLOY_PATH` | Repo/compose path on VPS |

If webhook/SSH secrets are unset, image push still succeeds — configure Coolify auto-deploy from GHCR/Git as fallback.

### Environment

Create GitHub Environment `production` for the deploy job (protection rules optional).

---

## Image tags

- `latest` on default branch  
- Full commit SHA tag for pin/rollback  

Compose: `IMAGE_TAG=<sha>`.

---

## Anti-patterns

- Deploying without CI green (except emergency `workflow_dispatch` + skip tests)  
- Building images on the VPS as the primary path  
- Storing registry passwords in the repo  
- Running migrations from a laptop against prod without logging the release  

---

## Manual emergency deploy

```bash
# On CI machine or laptop with Docker login to GHCR
docker build -f infra/docker/Dockerfile.api -t ghcr.io/ORG/REPO-api:manual .
docker push ghcr.io/ORG/REPO-api:manual
# Then Coolify → Redeploy with IMAGE_TAG=manual
```

Still prefer Actions for auditability.
