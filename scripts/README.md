# Scripts

| Script | Milestone | Purpose |
|--------|-----------|---------|
| `dev.sh` | M-002 | Local dev: Docker infra + all `apps/*` and `services/*` dev servers |
| `ensure-docker.sh` | M-002 | Ensure Docker is running (auto-starts Colima when available) |
| `setup.sh` | M-002 | First-time developer setup (install, env, Docker, verify) |
| `verify-milestone.sh` | M-001+ | Full milestone verification before final review |
| `run-tests-if-present.sh` | M-001+ | Runs tests when test files exist |
| `seed/` | M-010 | Idempotent database seed runner |
| `codegen/` | M-005+ | OpenAPI client generation |
