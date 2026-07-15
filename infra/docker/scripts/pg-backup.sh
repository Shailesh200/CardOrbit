#!/bin/sh
# Nightly Postgres dump → Cloudflare R2 (S3-compatible).
# Required env: DATABASE_URL, S3_BUCKET, S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
set -eu

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="/tmp/cardorbit-${STAMP}.sql.gz"
PREFIX="${BACKUP_PREFIX:-postgres}"

echo "[backup] dumping database…"
pg_dump "$DATABASE_URL" | gzip -9 >"$FILE"

echo "[backup] uploading to R2…"
aws --endpoint-url="$S3_ENDPOINT" s3 cp "$FILE" "s3://${S3_BUCKET}/${PREFIX}/${STAMP}.sql.gz"

# Retain ~30 days (best-effort list + delete older than 30d)
CUTOFF=$(date -u -d '30 days ago' +%Y%m%d 2>/dev/null || date -u -v-30d +%Y%m%d)
aws --endpoint-url="$S3_ENDPOINT" s3 ls "s3://${S3_BUCKET}/${PREFIX}/" | while read -r _ _ _ key; do
  name=$(basename "$key" .sql.gz)
  day=$(echo "$name" | cut -c1-8)
  if [ -n "$day" ] && [ "$day" -lt "$CUTOFF" ] 2>/dev/null; then
    aws --endpoint-url="$S3_ENDPOINT" s3 rm "s3://${S3_BUCKET}/${PREFIX}/$key" || true
  fi
done

rm -f "$FILE"
echo "[backup] done $STAMP"
