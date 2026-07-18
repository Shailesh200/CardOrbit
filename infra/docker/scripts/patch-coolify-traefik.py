#!/usr/bin/env python3
"""Patch Coolify-generated compose so Traefik can reach the API over HTTPS.

Coolify often omits an explicit Traefik service + docker network on the `api`
service. Without them, HTTP still redirects to HTTPS, but HTTPS hangs/gateway
times out (routers cannot auto-link when multiple services are inferred).

Run on the VPS after Coolify regenerates compose (Redeploy / recreate):

  python3 infra/docker/scripts/patch-coolify-traefik.py
  cd /data/coolify/applications/<uuid> && docker compose up -d --force-recreate --no-deps api

Or pass the compose path:

  python3 infra/docker/scripts/patch-coolify-traefik.py /data/coolify/applications/<uuid>/docker-compose.yaml
"""

from __future__ import annotations

import sys
from pathlib import Path

DEFAULT_COMPOSE = Path(
    "/data/coolify/applications/hoci5uux0n03wivuoxcj9awv/docker-compose.yaml"
)

UUID = "hoci5uux0n03wivuoxcj9awv"
SERVICE = f"api-{UUID}"
NETWORK = UUID

NEEDED = [
    f"traefik.docker.network={NETWORK}",
    f"traefik.http.routers.http-0-{UUID}-api.service={SERVICE}",
    f"traefik.http.routers.https-0-{UUID}-api.service={SERVICE}",
    f"traefik.http.services.{SERVICE}.loadbalancer.server.port=3000",
]


def patch(compose: Path) -> bool:
    baseline = compose.read_text()
    api_start = baseline.find("\n    api:\n")
    if api_start < 0:
        raise SystemExit("api service not found in compose")

    labels_idx = baseline.find("\n        labels:\n", api_start)
    if labels_idx < 0:
        raise SystemExit("api labels block not found")

    marker = "            - traefik.enable=true\n"
    if baseline.find(marker, labels_idx) < 0:
        raise SystemExit("traefik.enable=true not found under api labels")

    text = baseline
    for lab in NEEDED:
        text = text.replace(f"            - {lab}\n", "")

    labels_idx = text.find("\n        labels:\n", text.find("\n    api:\n"))
    idx = text.find(marker, labels_idx)
    if idx < 0:
        raise SystemExit("traefik.enable lost after cleanup")

    insert = marker + "".join(f"            - {lab}\n" for lab in NEEDED)
    new_text = text[:idx] + insert + text[idx + len(marker) :]

    if new_text == baseline:
        print(f"already patched: {compose}")
        return False

    backup = compose.with_suffix(compose.suffix + ".bak.traefik")
    backup.write_text(baseline)
    compose.write_text(new_text)
    print(f"patched: {compose} (backup {backup})")
    for lab in NEEDED:
        print(f"  + {lab}")
    return True


def main() -> None:
    compose = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_COMPOSE
    if not compose.is_file():
        raise SystemExit(f"compose not found: {compose}")
    patch(compose)


if __name__ == "__main__":
    main()
