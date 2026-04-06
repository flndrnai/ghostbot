#!/bin/bash
# Gemini CLI merge conflict resolution

gemini --output-format stream-json \
  "Resolve all git merge conflicts in this repo. For each conflicted file, examine both sides and choose the best resolution." \
  || exit 1
