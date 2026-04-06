#!/bin/bash
# Create or update PR
cd /home/coding-agent/workspace

CURRENT=$(git branch --show-current)
BASE="${BRANCH:-main}"

if [ "$CURRENT" = "$BASE" ]; then
  echo "[pr] on base branch, skipping PR"
  return 0
fi

PR_TITLE="${AGENT_JOB_TITLE:-Agent job}"
PR_BODY="${AGENT_JOB_DESCRIPTION:-Automated changes by GhostBot agent.}"

# Check if PR already exists
EXISTING=$(gh pr list --head "$CURRENT" --json number --jq '.[0].number' 2>/dev/null)

if [ -n "$EXISTING" ]; then
  echo "[pr] PR #$EXISTING already exists"
else
  gh pr create --title "$PR_TITLE" --body "$PR_BODY" --base "$BASE" --head "$CURRENT" 2>/dev/null && echo "PR_CREATED" || echo "PR_FAILED"
fi
