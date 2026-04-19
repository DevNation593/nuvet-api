#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

BACKUP_DIR=${BACKUP_DIR:-./backups}
mkdir -p "$BACKUP_DIR"

STAMP=$(date +"%Y%m%d-%H%M%S")
OUT_FILE="$BACKUP_DIR/nuvet-$STAMP.dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$OUT_FILE"

echo "Backup created: $OUT_FILE"
