#!/bin/bash
# GhostBot VPS cleanup — safe, thorough, idempotent.
#
# Run this on the VPS via SSH to reclaim disk space and kill
# dead processes without touching anything that's actually in
# use (GhostBot app container, docker.sock, persistent volumes,
# the currently running Ollama model).
#
# Usage:
#   ssh root@<your-vps>
#   bash <(curl -sS https://raw.githubusercontent.com/flndrnai/ghostbot/main/scripts/vps-cleanup.sh)
#
# Or copy-paste the block manually.

set -u  # no -e: we want to continue even if a step fails

blue()   { printf "\n\033[1;34m==> %s\033[0m\n" "$*"; }
green()  { printf "\033[0;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[0;33m%s\033[0m\n" "$*"; }
red()    { printf "\033[0;31m%s\033[0m\n" "$*"; }

blue "0. Snapshot BEFORE"
df -h / | awk 'NR==1 || /\//'
free -h | awk '/^Mem/'
docker system df 2>/dev/null | head -6 || true

# ─────────────────────────────────────────────────────────────
blue "1. Stopping idle Ollama models"
# Ollama keeps the last-used model in RAM for OLLAMA_KEEP_ALIVE.
# Unloading any that aren't actively serving frees a ton of RAM
# without touching the model files on disk.
if command -v ollama >/dev/null 2>&1; then
  ollama ps 2>/dev/null | awk 'NR>1 {print $1}' | while read -r model; do
    [ -n "$model" ] && ollama stop "$model" 2>/dev/null && green "  unloaded $model"
  done
else
  yellow "  ollama not installed, skipping"
fi

# ─────────────────────────────────────────────────────────────
blue "2. Docker: remove stopped containers"
docker container prune -f 2>/dev/null || yellow "  docker container prune skipped"

blue "3. Docker: remove dangling + unreferenced images"
# -a = include unreferenced (not just dangling <none>). Safe:
# anything currently used by a running container is kept.
docker image prune -af 2>/dev/null || yellow "  docker image prune skipped"

blue "4. Docker: remove build cache"
# The biggest win on most boxes. Old layer cache from past
# GhostBot builds can easily be 10-30 GB.
docker builder prune -af 2>/dev/null || yellow "  docker builder prune skipped"

blue "5. Docker: remove unused networks"
docker network prune -f 2>/dev/null || yellow "  docker network prune skipped"

# NOTE: we do NOT prune docker volumes. The ghostbot-data volume
# holds the SQLite DB and would be wiped by 'docker volume prune'.

# ─────────────────────────────────────────────────────────────
blue "6. Stale ghostbot-source repo"
# The /opt/ghostbot-source clone we use to build agent images.
# Reset to match origin/main, drop local junk, repack.
if [ -d /opt/ghostbot-source/.git ]; then
  cd /opt/ghostbot-source
  git fetch origin --quiet
  git reset --hard origin/main >/dev/null
  git clean -fdx --quiet
  git gc --auto --quiet
  green "  /opt/ghostbot-source synced to origin/main + cleaned"
  cd - >/dev/null
else
  yellow "  /opt/ghostbot-source not present, skipping"
fi

# ─────────────────────────────────────────────────────────────
blue "7. System package caches"
if command -v apt-get >/dev/null 2>&1; then
  apt-get autoremove -y >/dev/null 2>&1 || true
  apt-get clean >/dev/null 2>&1 || true
  rm -rf /var/lib/apt/lists/* 2>/dev/null || true
  green "  apt cache cleaned"
fi

# ─────────────────────────────────────────────────────────────
blue "8. Rotate + truncate large log files"
# Any log over 100 MB gets truncated. We don't delete /var/log
# entries because some services misbehave without their log
# file existing.
find /var/log -type f -size +100M 2>/dev/null | while read -r log; do
  truncate -s 0 "$log" && green "  truncated $log"
done

# journalctl logs — keep the last 3 days only
if command -v journalctl >/dev/null 2>&1; then
  journalctl --vacuum-time=3d >/dev/null 2>&1 && green "  journalctl vacuumed to 3 days"
fi

# ─────────────────────────────────────────────────────────────
blue "9. /tmp and /var/tmp old files"
# Remove anything in /tmp older than 7 days
find /tmp -mindepth 1 -type f -atime +7 -delete 2>/dev/null || true
find /var/tmp -mindepth 1 -type f -atime +14 -delete 2>/dev/null || true
green "  tmp dirs pruned"

# ─────────────────────────────────────────────────────────────
blue "10. Snapshot AFTER"
df -h / | awk 'NR==1 || /\//'
free -h | awk '/^Mem/'
docker system df 2>/dev/null | head -6 || true

echo
green "✅ Cleanup complete. Ollama models remain on disk; GhostBot app container untouched; ghostbot-data volume intact."
echo
echo "To go further (optional, only when you're sure):"
echo "  - docker volume prune      # removes orphan volumes — DO NOT run unless you know the ghostbot-data volume is still attached to a container"
echo "  - ollama rm <model:tag>    # removes a model file from disk (e.g. qwen2.5-coder:14b if you never use it)"
