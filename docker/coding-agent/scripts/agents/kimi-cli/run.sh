#!/bin/bash
# Kimi CLI headless run

AGENT_ARGS="--json"

# Optional model override
if [ -n "$LLM_MODEL" ]; then
  AGENT_ARGS="$AGENT_ARGS --model $LLM_MODEL"
fi

# Session continuation from port-keyed file
SESSION_FILE=~/.kimi-ttyd-sessions/7681
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    AGENT_ARGS="$AGENT_ARGS --session $SESSION_ID"
    echo "[run] Resuming session: $SESSION_ID"
  fi
fi

# Append the prompt
AGENT_ARGS="$AGENT_ARGS \"$PROMPT\""

echo "[run] Executing: kimi $AGENT_ARGS"
set +e
eval kimi $AGENT_ARGS
AGENT_EXIT=$?
set -e

exit $AGENT_EXIT
