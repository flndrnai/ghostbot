#!/bin/bash
# Clone repo if workspace is empty, otherwise skip (respects persisted volume)
cd /home/coding-agent/workspace

if [ -d ".git" ]; then
  echo "[clone] workspace already has a git repo, skipping clone"
  return 0
fi

# Check if workspace has files (volume mount)
if [ "$(ls -A .)" ]; then
  echo "[clone] workspace is not empty but has no .git, skipping clone"
  return 0
fi

if [ -n "$REPO_URL" ]; then
  # Agent-job: REPO_URL includes token
  git clone "$REPO_URL" . --branch "${BRANCH:-main}" --single-branch
elif [ -n "$REPO" ] && [ -n "$GH_TOKEN" ]; then
  git clone "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" . --branch "${BRANCH:-main}" --single-branch
else
  echo "[clone] no REPO or REPO_URL set, skipping clone"
  return 0
fi

echo "[clone] cloned ${REPO:-$REPO_URL} on branch ${BRANCH:-main}"
