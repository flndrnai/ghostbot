#!/bin/bash
# Codex CLI coding session via tmux + ttyd

SESSION_NAME="codex-${PORT}"
AGENT_ARGS=""

# Reattach if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "[session] Reattaching to existing session: $SESSION_NAME"
  exec tmux attach -t "$SESSION_NAME"
fi

# Session resume from port-keyed file
SESSION_FILE=~/.codex-ttyd-sessions/${PORT}
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    AGENT_ARGS="resume $SESSION_ID"
    echo "[session] Resuming session: $SESSION_ID"
  fi
fi

# Launch Codex inside tmux in workspace directory
tmux -u new-session -d -s "$SESSION_NAME" \
  -e PORT="${PORT}" \
  -c /home/coding-agent/workspace \
  codex $AGENT_ARGS

exec tmux attach -t "$SESSION_NAME"
