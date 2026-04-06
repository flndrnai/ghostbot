#!/bin/bash
# OpenCode interactive mode via tmux + ttyd

AGENT_ARGS=""

# Session resume from port-keyed file
SESSION_FILE=~/.opencode-ttyd-sessions/${PORT:-7681}
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    AGENT_ARGS="--session $SESSION_ID"
    echo "[interactive] Resuming session: $SESSION_ID"
  fi
fi

# Launch OpenCode inside tmux
tmux -u new-session -d -s opencode -e PORT="${PORT:-7681}" opencode $AGENT_ARGS

# Serve terminal via ttyd
exec ttyd --writable -p "${PORT:-7681}" tmux attach -t opencode
