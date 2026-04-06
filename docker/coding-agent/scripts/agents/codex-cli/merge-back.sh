#!/bin/bash
# Codex CLI merge conflict resolution

codex exec --json \
  "Resolve all git merge conflicts in this repo. For each conflicted file, examine both sides and choose the best resolution." \
  || exit 1
