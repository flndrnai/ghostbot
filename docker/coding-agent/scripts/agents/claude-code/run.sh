#!/bin/bash
# Claude Code headless run (plan mode)

AGENT_ARGS="--output-format stream-json -p $PERMISSION"

# Optional model override
if [ -n "$LLM_MODEL" ]; then
  AGENT_ARGS="$AGENT_ARGS --model $LLM_MODEL"
fi

# Optional system prompt
if [ -n "$SYSTEM_PROMPT" ]; then
  AGENT_ARGS="$AGENT_ARGS --append-system-prompt \"$SYSTEM_PROMPT\""
fi

# Session continuation — resume from port-keyed session file
SESSION_FILE=~/.claude-ttyd-sessions/7681
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    AGENT_ARGS="$AGENT_ARGS --resume $SESSION_ID"
    echo "[run] Resuming session: $SESSION_ID"
  fi
fi

# Append the prompt
AGENT_ARGS="$AGENT_ARGS \"$PROMPT\""

echo "[run] Executing: claude $AGENT_ARGS"
set +e
eval claude $AGENT_ARGS
AGENT_EXIT=$?
set -e

exit $AGENT_EXIT
