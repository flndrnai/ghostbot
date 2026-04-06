#!/bin/bash
# Pi Coding Agent environment setup

# Write system prompt if provided
mkdir -p ~/.pi
if [ -n "$SYSTEM_PROMPT" ]; then
  echo "$SYSTEM_PROMPT" > ~/.pi/SYSTEM.md
  echo "[setup] Wrote system prompt to ~/.pi/SYSTEM.md"
else
  rm -f ~/.pi/SYSTEM.md
fi

# Create session tracking directory
mkdir -p ~/.pi-ttyd-sessions
echo "[setup] Pi Coding Agent setup complete"
