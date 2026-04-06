#!/bin/bash
# Build the prompt from agent-job config
if [ -z "$PROMPT" ] && [ -n "$AGENT_JOB_DESCRIPTION" ]; then
  PROMPT="$AGENT_JOB_DESCRIPTION"
fi
echo "[prompt] ${#PROMPT} chars"
