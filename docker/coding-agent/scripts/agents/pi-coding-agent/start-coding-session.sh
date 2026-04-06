#!/bin/bash
# Pi Coding Agent coding session via tmux + ttyd

SESSION_NAME="pi-${PORT}"
AGENT_ARGS="--session-dir ~/.pi-ttyd-sessions/${PORT} -c"

# Reattach if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "[session] Reattaching to existing session: $SESSION_NAME"
  exec tmux attach -t "$SESSION_NAME"
fi

# Launch Pi inside tmux in workspace directory
tmux -u new-session -d -s "$SESSION_NAME" \
  -e PORT="${PORT}" \
  -c /home/coding-agent/workspace \
  pi $AGENT_ARGS

exec tmux attach -t "$SESSION_NAME"
