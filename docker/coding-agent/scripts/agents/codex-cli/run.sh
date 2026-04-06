#!/bin/bash
# Codex CLI headless run

AGENT_ARGS="exec --json"

# Approval mode based on permission level
if [ "$PERMISSION" = "plan" ]; then
  AGENT_ARGS="$AGENT_ARGS --approval-mode suggest"
fi

# Session continuation — resume or fresh
SESSION_FILE=~/.codex-ttyd-sessions/7681
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    AGENT_ARGS="resume $SESSION_ID"
    echo "[run] Resuming session: $SESSION_ID"
  fi
fi

# Append the prompt
AGENT_ARGS="$AGENT_ARGS \"$PROMPT\""

echo "[run] Executing: codex $AGENT_ARGS"
set +e
eval codex $AGENT_ARGS
AGENT_EXIT=$?
set -e

exit $AGENT_EXIT
