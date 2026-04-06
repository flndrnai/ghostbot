#!/bin/bash
# OpenCode coding session via tmux + ttyd

SESSION_NAME="opencode-${PORT}"
AGENT_ARGS=""

# Reattach if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "[session] Reattaching to existing session: $SESSION_NAME"
  exec tmux attach -t "$SESSION_NAME"
fi

# Session resume from port-keyed file
SESSION_FILE=~/.opencode-ttyd-sessions/${PORT}
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    AGENT_ARGS="--session $SESSION_ID"
    echo "[session] Resuming session: $SESSION_ID"
  fi
fi

# Launch OpenCode inside tmux in workspace directory
tmux -u new-session -d -s "$SESSION_NAME" \
  -e PORT="${PORT}" \
  -c /home/coding-agent/workspace \
  opencode $AGENT_ARGS

exec tmux attach -t "$SESSION_NAME"
