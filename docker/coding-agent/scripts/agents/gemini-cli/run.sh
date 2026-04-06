#!/bin/bash
# Gemini CLI headless run

AGENT_ARGS="--output-format stream-json"

# Optional model override
if [ -n "$LLM_MODEL" ]; then
  AGENT_ARGS="$AGENT_ARGS --model $LLM_MODEL"
fi

# Session continuation — validate and resume
SESSION_FILE=~/.gemini-ttyd-sessions/7681
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    # Validate session still exists
    if gemini --list-sessions 2>/dev/null | grep -q "$SESSION_ID"; then
      AGENT_ARGS="$AGENT_ARGS --resume $SESSION_ID"
      echo "[run] Resuming session: $SESSION_ID"
    else
      echo "[run] Session $SESSION_ID no longer valid, starting fresh"
    fi
  fi
fi

# Append the prompt
AGENT_ARGS="$AGENT_ARGS \"$PROMPT\""

echo "[run] Executing: gemini $AGENT_ARGS"
set +e
eval gemini $AGENT_ARGS
AGENT_EXIT=$?
set -e

exit $AGENT_EXIT
