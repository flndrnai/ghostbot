#!/bin/bash
# Create/checkout feature branch. Skips if FEATURE_BRANCH is empty or branch exists.
cd /home/coding-agent/workspace

if [ -z "$FEATURE_BRANCH" ]; then
  echo "[branch] no FEATURE_BRANCH set, staying on current branch"
  return 0
fi

CURRENT=$(git branch --show-current 2>/dev/null)
if [ "$CURRENT" = "$FEATURE_BRANCH" ]; then
  echo "[branch] already on $FEATURE_BRANCH"
  return 0
fi

if git show-ref --verify --quiet "refs/heads/$FEATURE_BRANCH" 2>/dev/null; then
  git checkout "$FEATURE_BRANCH"
  echo "[branch] checked out existing $FEATURE_BRANCH"
else
  git checkout -b "$FEATURE_BRANCH"
  echo "[branch] created $FEATURE_BRANCH from $(git branch --show-current)"
fi
