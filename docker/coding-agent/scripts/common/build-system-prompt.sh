#!/bin/bash
# Build system prompt for agent. Called by agent setup scripts.
# Writes to agent-specific location based on AGENT type.
if [ -z "$SYSTEM_PROMPT" ]; then
  return 0
fi

echo "[prompt] system prompt set (${#SYSTEM_PROMPT} chars)"
