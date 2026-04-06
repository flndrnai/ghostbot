#!/bin/bash
# Claude Code interactive mode via tmux + ttyd

AGENT_ARGS=""

# Session resume from port-keyed file
SESSION_FILE=~/.claude-ttyd-sessions/${PORT:-7681}
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
  if [ -n "$SESSION_ID" ]; then
    AGENT_ARGS="--resume $SESSION_ID"
    echo "[interactive] Resuming session: $SESSION_ID"
  fi
fi

# Launch Claude Code inside tmux
tmux -u new-session -d -s claude -e PORT="${PORT:-7681}" claude $AGENT_ARGS

# Serve terminal via ttyd
exec ttyd --writable -p "${PORT:-7681}" tmux attach -t claude
