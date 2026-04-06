#!/bin/bash
# Derive git identity from GH_TOKEN via GitHub API
if [ -n "$GH_TOKEN" ]; then
  echo "$GH_TOKEN" | gh auth login --with-token 2>/dev/null || true
  GIT_USER=$(gh api /user --jq '.login' 2>/dev/null || echo "ghostbot")
  GIT_EMAIL=$(gh api /user --jq '.email // ""' 2>/dev/null || echo "")
  if [ -z "$GIT_EMAIL" ]; then
    GIT_EMAIL="${GIT_USER}@users.noreply.github.com"
  fi
  git config --global user.name "$GIT_USER"
  git config --global user.email "$GIT_EMAIL"
  echo "[git] identity: $GIT_USER <$GIT_EMAIL>"
else
  git config --global user.name "ghostbot"
  git config --global user.email "ghostbot@localhost"
fi
