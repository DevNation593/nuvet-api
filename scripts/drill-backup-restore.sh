#!/usr/bin/env bash
set -euo pipefail

# Requires:
# - DATABASE_URL for source DB
# - DRILL_DATABASE_URL for temporary restore target

if [[ -z "${DATABASE_URL:-}" || -z "${DRILL_DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL and DRILL_DATABASE_URL are required"
  exit 1
fi

TMP_DIR=${TMP_DIR:-./backups}
mkdir -p "$TMP_DIR"
STAMP=$(date +"%Y%m%d-%H%M%S")
TMP_FILE="$TMP_DIR/drill-$STAMP.dump"

echo "[1/3] Creating backup"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$TMP_FILE"

echo "[2/3] Restoring backup into drill database"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DRILL_DATABASE_URL" "$TMP_FILE"

echo "[3/3] Verifying restore"
psql "$DRILL_DATABASE_URL" -c "select now();" >/dev/null

echo "DR drill completed successfully: $TMP_FILE"
