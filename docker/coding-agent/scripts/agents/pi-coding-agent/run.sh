#!/bin/bash
# Pi Coding Agent headless run

AGENT_ARGS="--mode json"

# Optional model override
if [ -n "$LLM_MODEL" ]; then
  AGENT_ARGS="$AGENT_ARGS --model $LLM_MODEL"
fi

# Session continuation
AGENT_ARGS="$AGENT_ARGS --session-dir ~/.pi-ttyd-sessions/7681 -c"

# Append the prompt
AGENT_ARGS="$AGENT_ARGS \"$PROMPT\""

echo "[run] Executing: pi $AGENT_ARGS"
set +e
eval pi $AGENT_ARGS
AGENT_EXIT=$?
set -e

exit $AGENT_EXIT
