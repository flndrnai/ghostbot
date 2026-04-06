#!/bin/bash
# OpenCode merge conflict resolution

opencode --format json \
  "Resolve all git merge conflicts in this repo. For each conflicted file, examine both sides and choose the best resolution." \
  || exit 1
