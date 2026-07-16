#!/bin/sh
set -eu

echo "[api] running prisma migrate deploy..."
bun x prisma migrate deploy

echo "[api] starting NestJS..."
exec bun run dist/main.js
