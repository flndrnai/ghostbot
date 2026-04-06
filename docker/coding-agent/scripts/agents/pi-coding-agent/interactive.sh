#!/bin/bash
# Pi Coding Agent interactive mode via tmux + ttyd

AGENT_ARGS="--session-dir ~/.pi-ttyd-sessions/${PORT:-7681} -c"

# Launch Pi inside tmux
tmux -u new-session -d -s pi -e PORT="${PORT:-7681}" pi $AGENT_ARGS

# Serve terminal via ttyd
exec ttyd --writable -p "${PORT:-7681}" tmux attach -t pi
