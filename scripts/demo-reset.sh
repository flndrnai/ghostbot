#!/usr/bin/env bash
# GhostBot demo reset — wipes the database and all user data, then
# lets the container rebuild the initial schema on next start.
#
# Run this as a daily cron on the demo host:
#   0 4 * * *  /app/scripts/demo-reset.sh
#
# Intentionally destructive. Only run on a host where DATA LOSS IS FINE.

set -euo pipefail

DATA_DIR="${DATA_DIR:-/app/data}"

if [ "${DEMO_MODE:-}" != "true" ] && [ "${DEMO_MODE:-}" != "1" ]; then
  echo "[demo-reset] Refusing to run: DEMO_MODE is not true. This script is destructive."
  exit 1
fi

echo "[demo-reset] Wiping $DATA_DIR (DEMO_MODE=true)..."

# Wipe the SQLite DB and any session logs. Keep the dir structure
# so auto-migrations can re-seed on next app start.
rm -rf \
  "$DATA_DIR/db" \
  "$DATA_DIR/memory" \
  "$DATA_DIR/workspaces" \
  "$DATA_DIR/projects" \
  "$DATA_DIR/uploads"

mkdir -p "$DATA_DIR/db" "$DATA_DIR/memory" "$DATA_DIR/workspaces"

# Trigger a restart so the app re-runs its init-on-startup logic
# (creates the empty DB, runs migrations). Assumes the service is
# managed by Dokploy / Docker Compose with restart: unless-stopped.
if [ -n "${CONTAINER_NAME:-}" ] && command -v docker >/dev/null 2>&1; then
  docker restart "$CONTAINER_NAME" || true
fi

echo "[demo-reset] Done. Fresh DB will initialise on next app start."
