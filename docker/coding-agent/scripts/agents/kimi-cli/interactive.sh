#!/bin/bash
# Kimi CLI interactive mode via tmux + ttyd

AGENT_ARGS=""

# Session resume from port-keyed file
SESSION_FILE=~/.kimi-ttyd-sessions/${PORT:-7681}
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    AGENT_ARGS="--session $SESSION_ID"
    echo "[interactive] Resuming session: $SESSION_ID"
  fi
fi

# Launch Kimi inside tmux
tmux -u new-session -d -s kimi -e PORT="${PORT:-7681}" kimi $AGENT_ARGS

# Serve terminal via ttyd
exec ttyd --writable -p "${PORT:-7681}" tmux attach -t kimi
