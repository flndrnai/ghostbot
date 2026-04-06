#!/bin/bash
# Claude Code merge conflict resolution

claude --output-format stream-json -p code \
  "Resolve all git merge conflicts in this repo. For each conflicted file, examine both sides and choose the best resolution." \
  || exit 1
