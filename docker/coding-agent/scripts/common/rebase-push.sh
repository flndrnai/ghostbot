#!/bin/bash
# Commit all changes, rebase onto base branch, push. Used by agent-job runtime.
cd /home/coding-agent/workspace

if [ -z "$(git status --porcelain)" ]; then
  echo "NO_CHANGES"
  return 0
fi

git add -A
git commit -m "${AGENT_JOB_TITLE:-Agent job changes}" --no-verify || true

BRANCH="${BRANCH:-main}"
git fetch origin "$BRANCH" 2>/dev/null || true

set +e
git rebase "origin/$BRANCH"
REBASE_EXIT=$?
set -e

if [ $REBASE_EXIT -ne 0 ]; then
  echo "[push] rebase conflict — attempting resolution"
  source /scripts/agents/${AGENT}/merge-back.sh || {
    git rebase --abort 2>/dev/null
    echo "REBASE_FAILED"
    return 1
  }
fi

CURRENT=$(git branch --show-current)
git push origin "$CURRENT" --force-with-lease 2>/dev/null && echo "PUSH_SUCCESS" || echo "PUSH_FAILED"
