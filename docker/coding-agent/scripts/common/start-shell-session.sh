#!/bin/bash
# Start a plain shell terminal (no coding agent)
SESSION_NAME="shell-${PORT}"

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  exec tmux attach -t "$SESSION_NAME"
fi

tmux -u new-session -d -s "$SESSION_NAME" -c /home/coding-agent/workspace bash
exec tmux attach -t "$SESSION_NAME"
